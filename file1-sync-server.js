// Simple Node.js server for calendar synchronization
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, 'calendar-data.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Initialize data file if it doesn't exist
async function initializeDataFile() {
    try {
        await fs.access(DATA_FILE);
    } catch (error) {
        // File doesn't exist, create it with sample data
        const initialData = {
            events: [
                {
                    id: 1,
                    title: "Weekly Newsletter #47",
                    date: "2024-12-25",
                    type: "newsletter",
                    description: "Year-end reflection and 2025 goals"
                },
                {
                    id: 2,
                    title: "Live Q&A Session",
                    date: "2024-12-28",
                    type: "webinar",
                    description: "Answering subscriber questions"
                }
            ],
            lastUpdated: new Date().toISOString()
        };
        await fs.writeFile(DATA_FILE, JSON.stringify(initialData, null, 2));
    }
}

// API Routes

// Get all events
app.get('/api/events', async (req, res) => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const calendarData = JSON.parse(data);
        res.json({
            success: true,
            events: calendarData.events,
            lastUpdated: calendarData.lastUpdated
        });
    } catch (error) {
        console.error('Error reading events:', error);
        res.status(500).json({ success: false, error: 'Failed to read events' });
    }
});

// Add new event
app.post('/api/events', async (req, res) => {
    try {
        const newEvent = req.body;
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const calendarData = JSON.parse(data);
        
        // Add unique ID if not provided
        if (!newEvent.id) {
            newEvent.id = Date.now() + Math.random();
        }
        
        calendarData.events.push(newEvent);
        calendarData.lastUpdated = new Date().toISOString();
        
        await fs.writeFile(DATA_FILE, JSON.stringify(calendarData, null, 2));
        
        res.json({
            success: true,
            event: newEvent,
            message: 'Event added successfully'
        });
    } catch (error) {
        console.error('Error adding event:', error);
        res.status(500).json({ success: false, error: 'Failed to add event' });
    }
});

// Update event
app.put('/api/events/:id', async (req, res) => {
    try {
        const eventId = parseFloat(req.params.id);
        const updatedEvent = req.body;
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const calendarData = JSON.parse(data);
        
        const eventIndex = calendarData.events.findIndex(e => e.id === eventId);
        if (eventIndex === -1) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }
        
        calendarData.events[eventIndex] = { ...calendarData.events[eventIndex], ...updatedEvent };
        calendarData.lastUpdated = new Date().toISOString();
        
        await fs.writeFile(DATA_FILE, JSON.stringify(calendarData, null, 2));
        
        res.json({
            success: true,
            event: calendarData.events[eventIndex],
            message: 'Event updated successfully'
        });
    } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).json({ success: false, error: 'Failed to update event' });
    }
});

// Delete event
app.delete('/api/events/:id', async (req, res) => {
    try {
        const eventId = parseFloat(req.params.id);
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const calendarData = JSON.parse(data);
        
        const eventIndex = calendarData.events.findIndex(e => e.id === eventId);
        if (eventIndex === -1) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }
        
        const deletedEvent = calendarData.events.splice(eventIndex, 1)[0];
        calendarData.lastUpdated = new Date().toISOString();
        
        await fs.writeFile(DATA_FILE, JSON.stringify(calendarData, null, 2));
        
        res.json({
            success: true,
            event: deletedEvent,
            message: 'Event deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ success: false, error: 'Failed to delete event' });
    }
});

// Delete recurring group
app.delete('/api/events/recurring/:groupId', async (req, res) => {
    try {
        const groupId = parseFloat(req.params.groupId);
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const calendarData = JSON.parse(data);
        
        const deletedEvents = calendarData.events.filter(e => e.recurringGroup === groupId);
        calendarData.events = calendarData.events.filter(e => e.recurringGroup !== groupId);
        calendarData.lastUpdated = new Date().toISOString();
        
        await fs.writeFile(DATA_FILE, JSON.stringify(calendarData, null, 2));
        
        res.json({
            success: true,
            deletedCount: deletedEvents.length,
            message: `${deletedEvents.length} recurring events deleted successfully`
        });
    } catch (error) {
        console.error('Error deleting recurring events:', error);
        res.status(500).json({ success: false, error: 'Failed to delete recurring events' });
    }
});

// Bulk operations
app.post('/api/events/bulk', async (req, res) => {
    try {
        const { events: newEvents } = req.body;
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const calendarData = JSON.parse(data);
        
        // Add unique IDs to new events
        const eventsWithIds = newEvents.map(event => ({
            ...event,
            id: event.id || (Date.now() + Math.random())
        }));
        
        calendarData.events.push(...eventsWithIds);
        calendarData.lastUpdated = new Date().toISOString();
        
        await fs.writeFile(DATA_FILE, JSON.stringify(calendarData, null, 2));
        
        res.json({
            success: true,
            addedCount: eventsWithIds.length,
            message: `${eventsWithIds.length} events added successfully`
        });
    } catch (error) {
        console.error('Error adding bulk events:', error);
        res.status(500).json({ success: false, error: 'Failed to add bulk events' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Calendar sync server is running',
        timestamp: new Date().toISOString()
    });
});

// Start server
async function startServer() {
    await initializeDataFile();
    app.listen(PORT, () => {
        console.log(`Calendar sync server running on port ${PORT}`);
        console.log(`API endpoints available at http://localhost:${PORT}/api/`);
    });
}

startServer().catch(console.error);

module.exports = app;