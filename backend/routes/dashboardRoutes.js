import express from "express";
const router = express.Router();

// GET dashboard data
router.get("/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    // TEMP dummy response (replace later with DB)
    res.json({
      userId,
      progress: 65,
      weakTopics: ["Linked List", "DBMS"],
      strongTopics: ["Arrays"],
      recentTests: [],
      learningHours: [
        { day: "Mon", hours: 2 }, { day: "Tue", hours: 3 }, { day: "Wed", hours: 1 },
        { day: "Thu", hours: 4 }, { day: "Fri", hours: 2 }, { day: "Sat", hours: 0 }, { day: "Sun", hours: 0 }
      ],
      totalHoursThisWeek: 12,
      subjects: [
        { name: "Data Structures", iconStr: "Cpu", face: "front", color: "bg-blue-500/20", textColor: "text-blue-400", progress: 65, lessons: 12, hours: 24 },
        { name: "Engineering Math", iconStr: "Activity", face: "left", color: "bg-green-500/20", textColor: "text-green-400", progress: 40, lessons: 8, hours: 16 }
      ],
      mentors: [
        { name: "AI Concept Guide", role: "Virtual Assistant", img: "https://i.pravatar.cc/150?u=ai" }
      ]
    });
  } catch (err) {
    res.status(500).json({ error: "Dashboard fetch failed" });
  }
});

export default router;
