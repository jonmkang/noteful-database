const path = require('path')
const express = require('express')
const xss = require('xss')
const NotesService = require('./notes-service');
const FoldersService = require('../folders/folders-service')
const { json } = require('express')

const notesRouter = express.Router()
const jsonParser = express.json()

const serializeNote = note => ({
    id: note.id,
    name: xss(note.name),
    content: xss(note.content),
    folder_id: note.folder_id
})

notesRouter 
    .route('/')
    .get((req, res, next) => {
        const knexInstance = req.app.get('db')
        NotesService.getAllNotes(knexInstance)
            .then(notes=> {
                res.json(notes.map(serializeNote))
            })
            .catch(next)
    })
    .post(jsonParser, (req, res, next) => {
        const { name, content, folder_id } = req.body;
        const newNote = { name, content, folder_id };
        const knexInstance = req.app.get('db');

        //Checks if all fields are filled out with a value
        const numberOfValues = Object.values(newNote).filter(Boolean).length
            if(numberOfValues === 0 ) {
                return res.status(400).json({
                    error: { message: `Request body must contain 'name', 'content', or 'folder_id'`}
                })
            }
            
        //Checks if the folder_id exists in the folders table
        FoldersService.getAllFolders(knexInstance)
            .then(folders => {
                if(folders.filter(folder => folder.id == newNote.folder_id).length === 0)
                {
                    return res.status(400).json({
                        error: { message: `Folder id must be valid` }
                    })
                }
            })

        //Adds the note if all fields are valid and folder_id is a valid folder
        NotesService.insertNote(
            knexInstance, newNote
        )
            .then(note => {
                res.status(201)
                    .location(path.posix.join(req.originalUrl, `/${note.id}`))
                    .json(serializeNote(note))
            })
            .catch(next)
    })

notesRouter
    .route('/:note_id')
    .all((req, res, next) => {
        NotesService.getById(
            req.app.get('db'),
            req.params.note_id
        )
            .then(note => {
                if(!note){
                    return res.status(404).json({
                        error: { message: `Note doesn't exist` }
                    })
                }
                res.note = note
                next()
            })
            .catch()
    })
    .get((req, res, next) => {
        res.json(serializeNote(res.note))
    })
    .delete((req, res, next) => {
        NotesService.deleteNote(
            req.app.get('db'),
            req.params.note_id
        )
            .then(numRowsAffected => {
                res.status(204).end()
            })
            .catch(next)
    })
    .patch(jsonParser, (req, res, next) => {
        const { name, content, folder_id } = req.body
        const updateNote = { name, content, folder_id } 

        const numberOfValues = Object.values(updateNote).filter(Boolean).length
            if(numberOfValues === 0 ) {
                return res.status(400).json({
                    error: { message: `Request body must contain 'name', 'content', or 'folder_id'`}
                })
            }
        
        NotesService.updateNote(req.app.get('db'), req.params.note_id, updateNote)
            .then(numRowsAffected => {
                res.status(204).end()
            })
            .catch(next)
    })


module.exports = notesRouter;