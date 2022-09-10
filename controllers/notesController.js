const User = require('../models/User')
const Note = require('../models/Note')

// @desc Get all notes
// @route GET /notes
// @access Private
const getAllNotes = async (req, res) => {
    const notes = await Note.find().lean()
    if (!notes?.length) {
        return res.status(400).json({ message: 'No notes found' })
    }

    // Add username to each note before sending the response
    // See Promise.all with map() here: https://youtu.be/4lqJBBEpjRE
    // You could also do this with a for...of loop
    const notesWithUser = await Promise.all(
        notes.map(async (note) => {
            const user = await User.findById(note.user).lean().exec()
            return { ...note, username: user.username }
        })
    )

    res.json(notesWithUser)
}

// @desc Create new note
// @route POST /notes
// @access Private
const createNewNote = async (req, res) => {
    const { user: id, title, text } = req.body

    // Confirm data
    if (!id || !title || !text) {
        return res.status(400).json({ message: 'All fields are required' })
    }

    // Check for user
    const user = await User.findOne({ _id: id }).lean().exec()

    if (!user) {
        return res.status(409).json({ message: 'user is not found' })
    }

    // Check for duplicate title
    const duplicate = await Note.findOne({ title }).collation({ locale: 'en', strength: 2 }).lean().exec()

    if (duplicate) {
        return res.status(409).json({ message: 'Duplicate note title' })
    }

    const noteObject = { user: id, title, text }

    // Create and store new note
    const note = await Note.create(noteObject)

    if (note) {
        res.status(201).json({ message: `New note ${title} created` })
    } else {
        res.status(400).json({ message: `Invalid note data received` })
    }
}

// @desc Update a note
// @route PATCH /notes
// @access Private
const updateNote = async (req, res) => {
    const { id, title, text, user: userId, completed } = req.body

    // Confirm data
    if (
        !id ||
        !title ||
        !text ||
        !userId ||
        (completed && typeof completed !== 'boolean')
    ) {
        return res.status(400).json({ message: 'All fields are required' })
    }

    const user = await User.findById(userId).exec()

    if (!user) {
        return res.status(400).json({ message: 'User is not found' })
    }

    const note = await Note.findById(id).exec()

    if (!note) {
        return res.status(400).json({ message: 'Note is not found' })
    }

    // Check for duplicate
    const duplicate = await Note.findOne({ title }).collation({ locale: 'en', strength: 2 }).lean().exec()
    // Allow updates to the original user
    if (duplicate && duplicate._id.toString() !== id) {
        return res.status(409).json({ message: 'Duplicate title' })
    }

    note.title = title
    note.text = text

    if (completed) {
        note.completed = completed
    }

    const updatedUser = await note.save()

    res.json({ message: `${updatedUser.title} updated` })
}

// @desc Delete a note
// @route DELETE /notes
// @access Private
const deleteNote = async (req, res) => {
    const { id, user } = req.body

    if (!id || !user) {
        return res
            .status(400)
            .json({ message: 'Note ID and user ID are required' })
    }

    const note = await Note.findOne({ _id: id, user }).exec()
    if (!note) {
        return res.status(400).json({ message: 'Note is not found' })
    }

    const result = await note.deleteOne()

    res.json(`Note title ${result.title} with ID ${result._id} deleted`)
}

module.exports = {
    getAllNotes,
    createNewNote,
    updateNote,
    deleteNote,
}
