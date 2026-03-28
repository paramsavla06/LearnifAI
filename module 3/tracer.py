"""
Module 3 - Root Cause Tracer
Pure graph logic using NetworkX. No DB or FastAPI imports.
"""

import networkx as nx
from typing import List, Dict, Optional
from dataclasses import dataclass

@dataclass
class GapNode:
    slug: str
    name: str
    subject: str
    difficulty: int
    mastery_score: float      # -1 if never assessed
    is_assessed: bool
    strength: str             # "required" | "recommended" | "root"
    depth: int                # hops from the failed concept (0 = direct prereq)

@dataclass
class TraceResult:
    failed_concept_slug: str
    failed_concept_name: str
    gap_chain: List[GapNode]          # topologically sorted, learn this order
    required_gaps: List[GapNode]      # only strength="required" gaps
    recommended_gaps: List[GapNode]   # only strength="recommended" gaps
    root_causes: List[GapNode]        # nodes with NO unmastered prerequisites
    total_gaps: int
    max_depth: int
    learning_path: List[str]          # slugs in topological order (study plan)

def find_root_gaps(
    G: nx.DiGraph,
    failed_slug: str,
    mastery_scores: Dict[str, float],
    threshold: float = 0.4,
    include_recommended: bool = True,
    max_depth: int = 10,
) -> TraceResult:
    # 1. Validate slug
    if failed_slug not in G:
        raise ValueError(f"Concept '{failed_slug}' not found in graph.")

    failed_node_data = G.nodes[failed_slug]
    failed_name = failed_node_data.get("name", failed_slug)

    # 2. BFS backwards to find gaps
    gap_slugs = set()
    slug_to_depth = {}
    slug_to_strength = {failed_slug: "root"}
    
    queue = [(failed_slug, 0)]
    visited = {failed_slug}

    while queue:
        current_slug, current_depth = queue.pop(0)
        
        if current_depth > 0:
            score = mastery_scores.get(current_slug, -1)
            if score < threshold:
                gap_slugs.add(current_slug)
                # Keep the shortest path depth
                if current_slug not in slug_to_depth:
                   slug_to_depth[current_slug] = current_depth

        if current_depth < max_depth:
            for pred in G.predecessors(current_slug):
                strength = G[pred][current_slug].get("strength", "required")
                if not include_recommended and strength == "recommended":
                    continue
                
                if pred not in visited:
                    visited.add(pred)
                    # Track strength relative to the first encountered path
                    if pred not in slug_to_strength:
                        slug_to_strength[pred] = strength
                    queue.append((pred, current_depth + 1))

    # 3. Subgraph and Topological Sort
    gap_subgraph = G.subgraph(gap_slugs)
    learning_path = list(nx.topological_sort(gap_subgraph))

    # 4. Filter nodes
    gap_nodes = []
    for slug in learning_path:
        data = G.nodes[slug]
        score = mastery_scores.get(slug, -1)
        node = GapNode(
            slug=slug,
            name=data.get("name", slug),
            subject=data.get("subject", "Unknown"),
            difficulty=data.get("difficulty", 3),
            mastery_score=score,
            is_assessed=score != -1,
            strength=slug_to_strength.get(slug, "required"),
            depth=slug_to_depth.get(slug, 0)
        )
        gap_nodes.append(node)

    required_gaps = [n for n in gap_nodes if n.strength == "required"]
    recommended_gaps = [n for n in gap_nodes if n.strength == "recommended"]
    
    # Root causes: gaps with no predecessors WITHIN the gap set
    root_causes = []
    for slug in gap_slugs:
        is_root = True
        for pred in G.predecessors(slug):
            if pred in gap_slugs:
                is_root = False
                break
        if is_root:
            # Find the GapNode object
            root_node = next((n for n in gap_nodes if n.slug == slug), None)
            if root_node:
                root_causes.append(root_node)

    return TraceResult(
        failed_concept_slug=failed_slug,
        failed_concept_name=failed_name,
        gap_chain=gap_nodes,
        required_gaps=required_gaps,
        recommended_gaps=recommended_gaps,
        root_causes=root_causes,
        total_gaps=len(gap_nodes),
        max_depth=max(slug_to_depth.values()) if slug_to_depth else 0,
        learning_path=learning_path
    )

def batch_trace(
    G: nx.DiGraph,
    student_mastery: Dict[str, float],
    threshold: float = 0.4,
) -> List[TraceResult]:
    # Find all assessed failing concepts
    failing_slugs = [slug for slug, score in student_mastery.items() 
                     if 0 <= score < threshold]
    
    results = []
    for slug in failing_slugs:
        if slug in G:
            results.append(find_root_gaps(G, slug, student_mastery, threshold))
    
    return sorted(results, key=lambda x: x.total_gaps, reverse=True)

def get_learning_path(
    G: nx.DiGraph,
    target_slug: str,
    mastery_scores: Dict[str, float],
    threshold: float = 0.4,
) -> List[str]:
    if target_slug not in G:
        return []
        
    ancestors = nx.ancestors(G, target_slug) | {target_slug}
    unmastered = {slug for slug in ancestors if mastery_scores.get(slug, -1) < threshold}
    
    subgraph = G.subgraph(unmastered)
    return list(nx.topological_sort(subgraph))
