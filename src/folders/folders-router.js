const path = require('path')
const express = require('express')
const xss = require('xss')
const FoldersService = require('./folders-service');
const { json } = require('express');

const foldersRouter = express.Router()
const jsonParser = express.json()

const serializeFolder = Folder => ({
    id: Folder.id,
    name: xss(Folder.name),
})

foldersRouter 
    .route('/')
    .get((req, res, next) => {
        const knexInstance = req.app.get('db')
        FoldersService.getAllFolders(knexInstance)
            .then(Folders=> {
                res.json(Folders.map(serializeFolder))
            })
            .catch(next)
    })
    .post(jsonParser, (req, res, next) => {
        const { name } = req.body;
        const newFolder = { name }

        if(!name){
            return res.status(404).json({
                error: { message: 'Missing name in request body'}
            })
        }

        FoldersService.insertFolder(
            req.app.get('db'),
            newFolder
        )
            .then(folder => {
                res.status(201)
                    .location(path.posix.join(req.originalUrl, `/${folder.id}`))
                    .json(serializeFolder(folder))
            })
            .catch(next)
    })

foldersRouter
    .route('/:folder_id')
    .all((req, res, next) => {
        FoldersService.getById(
            req.app.get('db'),
            req.params.folder_id
        )
            .then(folder => {
                if(!folder){
                    return res.status(404).json({
                        error: { message: `Folder doesn't exist`}
                    })
                }
                res.folder = folder
                next()
            })
            .catch(next)
    })
    .get((req, res) => {
        res.json(serializeFolder(res.folder))
    })
    .delete((req, res, next) => {
        FoldersService.deleteFolder(
            req.app.get('db'),
            req.params.folder_id
        )
            .then(numRowsAffected => {
                res.status(204).end()
            })
            .catch(next)
    })
    .patch(jsonParser, (req, res, next) => {
        const { name } = req.body
        const updateFolder = { name }

        if(!updateFolder.name){
            return res.status(400).json({
                error: {
                    message: 'Request body must contain name'
                }
            })
        }
        FoldersService.updateFolder(req.app.get('db'), req.params.folder_id, updateFolder)
            .then(numRowsAffected => {
                res.status(204).end()
            })
    })


module.exports = foldersRouter;