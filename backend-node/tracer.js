/**
 * Module 3 — Root Cause Tracer
 * Pure graph logic, replaces Python's NetworkX with a lightweight JS implementation.
 */

import { exportD3Graph } from './graphDb.js';
import { getAllMastery } from './quizStore.js';

// ─── Lightweight DiGraph ───────────────────────────────────────────────────────
class DiGraph {
  constructor() {
    this.nodes = new Map();      // slug -> attributes
    this.adjOut = new Map();     // slug -> [{ target, strength }]
    this.adjIn = new Map();      // slug -> [{ source, strength }]
  }
  addNode(id, attrs) { this.nodes.set(id, attrs); if (!this.adjOut.has(id)) this.adjOut.set(id, []); if (!this.adjIn.has(id)) this.adjIn.set(id, []); }
  addEdge(src, tgt, strength) { this.adjOut.get(src)?.push({ target: tgt, strength }); this.adjIn.get(tgt)?.push({ source: src, strength }); }
  has(id) { return this.nodes.has(id); }
  getNode(id) { return this.nodes.get(id); }
  predecessors(id) { return (this.adjIn.get(id) || []).map(e => ({ slug: e.source, strength: e.strength })); }
  successors(id) { return (this.adjOut.get(id) || []).map(e => ({ slug: e.target, strength: e.strength })); }
}

// ─── Topological sort for subgraph ─────────────────────────────────────────────
function topoSort(graph, slugSet) {
  const visited = new Set();
  const result = [];
  function dfs(slug) {
    if (visited.has(slug)) return;
    visited.add(slug);
    for (const { slug: pred } of graph.predecessors(slug)) {
      if (slugSet.has(pred)) dfs(pred);
    }
    result.push(slug);
  }
  for (const slug of slugSet) dfs(slug);
  return result;
}

// ─── Load graph from DB ────────────────────────────────────────────────────────
export function loadGraph(subjectFilter = null) {
  const data = exportD3Graph(null, subjectFilter);
  const G = new DiGraph();
  for (const node of data.nodes) G.addNode(node.id, node);
  for (const link of data.links) G.addEdge(link.source, link.target, link.strength);
  return G;
}

export function loadMastery(studentId) {
  const records = getAllMastery(studentId);
  const map = {};
  for (const r of records) map[r.slug] = r.score;
  return map;
}

// ─── Find root gaps ────────────────────────────────────────────────────────────
export function findRootGaps(G, failedSlug, masteryScores, threshold = 0.4, includeRecommended = true, maxDepth = 10) {
  if (!G.has(failedSlug)) throw new Error(`Concept '${failedSlug}' not found in graph.`);

  const failedNodeData = G.getNode(failedSlug);
  const failedName = failedNodeData?.name || failedSlug;

  const gapSlugs = new Set();
  const slugToDepth = {};
  const slugToStrength = { [failedSlug]: 'root' };

  const queue = [[failedSlug, 0]];
  const visited = new Set([failedSlug]);

  while (queue.length) {
    const [currentSlug, currentDepth] = queue.shift();
    if (currentDepth > 0) {
      const score = masteryScores[currentSlug] ?? -1;
      if (score < threshold) {
        gapSlugs.add(currentSlug);
        if (!(currentSlug in slugToDepth)) slugToDepth[currentSlug] = currentDepth;
      }
    }
    if (currentDepth < maxDepth) {
      for (const { slug: pred, strength } of G.predecessors(currentSlug)) {
        if (!includeRecommended && strength === 'recommended') continue;
        if (!visited.has(pred)) {
          visited.add(pred);
          if (!(pred in slugToStrength)) slugToStrength[pred] = strength;
          queue.push([pred, currentDepth + 1]);
        }
      }
    }
  }

  const learningPath = topoSort(G, gapSlugs);

  const gapNodes = learningPath.map(slug => {
    const data = G.getNode(slug);
    const score = masteryScores[slug] ?? -1;
    return {
      slug, name: data?.name || slug, subject: data?.subject || 'Unknown',
      difficulty: data?.difficulty || 3, mastery_score: score,
      is_assessed: score !== -1, strength: slugToStrength[slug] || 'required',
      depth: slugToDepth[slug] || 0,
    };
  });

  const requiredGaps = gapNodes.filter(n => n.strength === 'required');
  const recommendedGaps = gapNodes.filter(n => n.strength === 'recommended');

  const rootCauses = [];
  for (const slug of gapSlugs) {
    let isRoot = true;
    for (const { slug: pred } of G.predecessors(slug)) {
      if (gapSlugs.has(pred)) { isRoot = false; break; }
    }
    if (isRoot) {
      const node = gapNodes.find(n => n.slug === slug);
      if (node) rootCauses.push(node);
    }
  }

  return {
    failedConceptSlug: failedSlug, failedConceptName: failedName,
    gapChain: gapNodes, requiredGaps, recommendedGaps, rootCauses,
    totalGaps: gapNodes.length,
    maxDepth: Object.values(slugToDepth).length ? Math.max(...Object.values(slugToDepth)) : 0,
    learningPath,
  };
}

export function batchTrace(G, studentMastery, threshold = 0.4) {
  const failingSlugs = Object.entries(studentMastery)
    .filter(([, score]) => score >= 0 && score < threshold)
    .map(([slug]) => slug);

  const results = [];
  for (const slug of failingSlugs) {
    if (G.has(slug)) results.push(findRootGaps(G, slug, studentMastery, threshold));
  }
  return results.sort((a, b) => b.totalGaps - a.totalGaps);
}

export function getLearningPath(G, targetSlug, masteryScores, threshold = 0.4) {
  if (!G.has(targetSlug)) return [];
  // Find ancestors via BFS
  const ancestors = new Set([targetSlug]);
  const queue = [targetSlug];
  while (queue.length) {
    const current = queue.shift();
    for (const { slug: pred } of G.predecessors(current)) {
      if (!ancestors.has(pred)) { ancestors.add(pred); queue.push(pred); }
    }
  }
  const unmastered = new Set([...ancestors].filter(slug => (masteryScores[slug] ?? -1) < threshold));
  return topoSort(G, unmastered);
}
