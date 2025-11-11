const router = require('express').Router();
const Roadmap = require('../models/Roadmap');
const auth = require('../middleware/auth');

// Create new roadmap
router.post('/', auth, async (req, res) => {
  try {
    const { title, content } = req.body;
    const newRoadmap = new Roadmap({
      userId: req.user.id,
      title,
      content
    });

    const savedRoadmap = await newRoadmap.save();
    res.status(201).json(savedRoadmap);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all roadmaps for a user
router.get('/history', auth, async (req, res) => {
  try {
    const roadmaps = await Roadmap.find({ userId: req.user.id })
      .sort({ createdAt: -1 });
    res.json(roadmaps);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get specific roadmap
router.get('/:id', auth, async (req, res) => {
  try {
    const roadmap = await Roadmap.findById(req.params.id);
    if (!roadmap) {
      return res.status(404).json({ message: 'Roadmap not found' });
    }
    if (roadmap.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(roadmap);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;