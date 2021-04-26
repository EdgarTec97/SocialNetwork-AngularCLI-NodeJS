'use strict'

var mongoosePaginate = require('mongoose-pagination');

var Publication = require('../models/publication');
var Follow = require('../models/follow');
var User = require('../models/user');

var fs = require('fs');
var path = require('path');
var moment = require('moment');


/*** Método de pruebas ***/
function probando(req, res){
	res.status(200).send({message: 'Testing pruebas'});
}

/*** Método para guardar nuevas publicaciones ***/
function savePublication(req, res){
	var params = req.body;

	if(!params.text) return res.status(200).send({message: 'ERROR: Debes enviar un texto'});
	var publication = new Publication();
	publication.text = params.text;
	publication.file = null;
	publication.user = req.user.sub;
	publication.created_at = moment().unix();

	publication.save((err, publicationStored) => {
		if(err) return res.status(500).send({message: 'ERROR al guardar la publicación!!!'});
		if(!publicationStored) return res.status(404).send({message: 'ERROR: la publicación no ha sido guardada'});

		return res.status(200).send({publicationStored});
	});
}

/*** Método para devolver las publicaciones de los usuarios que estoy siguiendo ***/
function getPublications(req, res){

	var page = 1;
	if(req.params.page){
		page = req.params.page;
	}

	var items_per_page = 5;

	Follow.find({user: req.user.sub}).exec((err,follows) => {
		if(err) return res.status(500).send({message: 'ERROR al devolver el seguimiento!!!'});

		var follows_clean = [];

		follows.forEach((follow) => {
			follows_clean.push(follow.followed);
		});
		follows_clean.push(req.user.sub); // Añado también mis publicaciones

		Publication.find({user: {'$in': follows_clean}}).sort('-created_at').populate('user', 'name surname image _id').paginate(page, items_per_page, (err, publications, total) => {
			if(err) return res.status(500).send({message: 'ERROR al devolver publicaciones!!!'});
			if(total == 0) return res.status(404).send({message: 'NO hay publicaciones'});

			return res.status(200).send({
				total_items: total,
				pages: Math.ceil(total/items_per_page),
				page: page,
				items_per_page: items_per_page,
				publications
			})
		});
	});
}

/*** Método para devolver las publicaciones de un usuario concreto ***/
function getPublicationsByUser(req, res){
	var user_id;
	var page = 1;

	if(!req.params.id){
		return res.status(500).send({message: 'ERROR al devolver publicaciones!!!'});
	}else{
		user_id  = req.params.id;
	}
	if(req.params.page){
		page = req.params.page;
	}

	var items_per_page = 5;

	Publication.find({user: user_id}).sort('-created_at').populate('user', 'name surname image _id').paginate(page, items_per_page, (err, publications, total) => {
		if(err) return res.status(500).send({message: 'ERROR al devolver publicaciones!!!'});
		if(total == 0) return res.status(404).send({message: 'NO hay publicaciones'});

		return res.status(200).send({
			total_items: total,
			pages: Math.ceil(total/items_per_page),
			page: page,
			items_per_page: items_per_page,
			publications
		})
	});
}

/*** Método para devolver una publicación por su id ***/
function getPublication(req, res){
	var publication_id = req.params.id;

	Publication.findById(publication_id, (err, publication) => {
		if(err) return res.status(500).send({message: 'ERROR al devolver la publicacion!!!'});
		if(publication.length == 0) res.status(404).send({message: 'NO existe la publiación!!'});

		return res.status(200).send({publication});
	});
}

function deletePublication(req, res){
	var publication_id = req.params.id;

	Publication.findOneAndRemove({user: req.user.sub, '_id':publication_id},(err, publicationRemoved) => {
		if(err) return res.status(500).send({message: 'ERROR al borrar la publicacion!!!'});
		if(!publicationRemoved) res.status(404).send({message: 'NO se ha borrado la publicación!! Comprueba que seas su autor.'});

		return res.status(200).send({message: 'Publicación eliminada correctamente'});
	});
}

/*** Método para subir archivos a la publicación ***/
function uploadImage(req, res){
	let userId = req.user.sub;
	const publicationId = req.params.id;
	if(req.files){
		console.log(req.files);
		var filePath = req.files.image.path;
		var fileSplit = filePath.split('\\');
		var fileName =fileSplit[2];
		var exSplit = fileName.split('\.');
		var fileExt = exSplit[1];
		if(fileExt == 'png' || fileExt == 'jpg' || fileExt == 'jpeg' || fileExt == 'gif'){
			Publication.find({'_id':publicationId,'user':userId},(err, PTT)=>{
				if (err) return res.status(500).send({message: "Error al subir imagen en 1"});
				if (!PTT) return res.status(404).send({message: "No tienes permiso para subir imagen"});
				if (PTT.length >= 1) {
					Publication.findByIdAndUpdate(publicationId,{file: fileName},{new:true},(err,publicationUpload) => {
						if(err) return res.status(500).send({message: "Error al guardar la imagen"});
						if(!publicationUpload) return res.status(404).send({message: "No hay imagen para guardar"});
						return res.status(200).send({
							publication: publicationUpload,
							user: userId
						});
					});
				}else{
					return removeFilesToUpload(res, filePath, 'No tienes permiso para actualizar una imagen en esta publicación');
				}
			});
		}else{
			return removeFilesToUpload(res, filePath, 'Extensión no valida');
		}
	}else{
		return res.status(200).send({message: "No se han subido archivos"}); 
	}
}

/*** Método para mostrar el archivo de la publicación ***/
function getImageFile(req, res){
	var image_file = req.params.imageFile;
	var path_file = './uploads/publications/'+image_file;

	fs.exists(path_file, (exists) => {
		if(exists){
			res.sendFile(path.resolve(path_file));
		}else{
			res.status(200).send({message: 'NO existe la imagen!!!'});
		}
	});
}


module.exports = {
	probando,
	savePublication,
	getPublications,
	getPublicationsByUser,
	getPublication,
	deletePublication,
	uploadImage,
	getImageFile,
}


//** FUNCIONES AUXILIARES **//

/*** Método auxiliar para borrar ficheros subidos ***/
function removeFilesUploads(res, file_path, message){
	fs.unlink(file_path, (err) => {
		return res.status(200).send({message: message});
	});
}