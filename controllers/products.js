const fs = require("fs");

const Sauce = require("../models/Sauce");

// Get a list of all sauces

exports.getAllSauces = (req, res, next) => {
  Sauce.find()
    .then((data) => {
      return res.status(200).json(data);
    })
    .catch((err) => res.status(400).json({ message: "Erreur: " + err }));
};

// Get a sauce by Id

exports.getSauceById = (req, res, next) => {
  const prodId = req.params.id;
  Sauce.findById(prodId)
    .then((data) => {
      return res.status(200).json(data);
    })
    .catch((err) => res.status(400).json({ message: "Erreur: " + err }));
};

// Add a Sauce to de DB

exports.postAddSauce = (req, res, next) => {
  const sauceObject = JSON.parse(req.body.sauce);

  // If the image sauce is not of the correct mimetype return error.
  if (req.mimetypeError) {
    return res.status(400).json({
      message:
        "Erreur: Le fichier n'est pas dans un format valide: png, jpg ou jpeg",
    });
  }

  sauceObject.imageUrl = `${req.protocol}://${req.get("host")}/images/${
    req.file.filename
  }`;
  sauceObject.likes = 0;
  sauceObject.dislikes = 0;
  sauceObject.usersLikes = [];
  sauceObject.userDislikes = [];
  const sauce = new Sauce({ ...sauceObject });
  sauce
    .save()
    .then(() => {
      res.status(201).json({ message: "objet cree" });
    })
    .catch((err) => res.status(400).json({ message: "Erreur: " + err }));
};

// Like or Unlike / dislike ou undislake de Sauces

exports.postLikeSauce = (req, res, next) => {
  const prodId = req.params.id;
  const userId = req.body.userId;
  const like = req.body.like;

  // If like is 1, add a like if the user haven't liked it yet.

  if (like === 1) {
    Sauce.findOneAndUpdate(
      { _id: prodId, usersLiked: { $nin: userId } },
      { $push: { usersLiked: [userId] }, $inc: { likes: +1 } }
    )
      .then(() => {
        res.status(201).json({ message: "objet updated" });
      })
      .catch((err) => res.status(400).json({ message: "Erreur: " + err }));

    // If like is -1, add a dislike if the user haven't disliked it yet.
  } else if (like === -1) {
    Sauce.findOneAndUpdate(
      { _id: prodId, usersDisliked: { $nin: userId } },
      { $push: { usersDisliked: [userId] }, $inc: { dislikes: 1 } }
    )
      .then(() => {
        res.status(201).json({ message: "objet updated" });
      })
      .catch((err) => res.status(400).json({ message: "Erreur: " + err }));

    // Remove like or dislike from the sauce.
  } else {
    Sauce.findOneAndUpdate(
      { _id: prodId, usersDisliked: { $in: userId } },
      { $pull: { usersDisliked: userId }, $inc: { dislikes: -1 } }
    )
      .then((state) => {
        if (!state) {
          return Sauce.findOneAndUpdate(
            { _id: prodId, usersLiked: { $in: userId } },
            { $pull: { usersLiked: userId }, $inc: { likes: -1 } }
          );
        }
      })
      .then(() => {
        res.status(201).json({ message: "objet updated" });
      })
      .catch((err) => {
        console.log(err);
        res.status(400).json({ message: "Erreur: " + err });
      });
  }
};

// Remove sauce from DB

exports.deleteSauce = (req, res, next) => {
  const prodId = req.params.id;
  console.log(prodId);
  Sauce.findById(prodId)
    .then((sauce) => {
      const filename = sauce.imageUrl.split("/images/")[1];
      fs.unlink(`images/${filename}`, () => {
        Sauce.deleteOne({ _id: prodId })
          .then(() => res.status(200).json({ message: "Objet suprimé" }))
          .catch((err) => res.status(400).json({ message: "Erreur: " + err }));
      });
    })
    .catch((err) => res.status(500).json({ messagge: err }));
};

// Modify a Sauce

exports.putUpdateSauce = (req, res, next) => {
  const prodId = req.params.id;
  if (req.file) {
    Sauce.findById(prodId)
      .then((sauce) => {
        const filename = sauce.imageUrl.split("/images/")[1];
        const sentImageUrl = `${req.protocol}://${req.get("host")}/images/${
          req.file.filename
        }`;

        // Removing old file image and updating sauce
        fs.unlink(`images/${filename}`, () => {
          Sauce.updateOne(
            { _id: prodId },
            { ...req.body, _id: prodId, imageUrl: sentImageUrl }
          )
            .then(() => {
              res.status(200).json({ message: "Objet modifié" });
            })
            .catch((err) =>
              res.status(400).json({ message: "Erreur: " + err })
            );
        });
      })
      .catch((err) => res.status(500).json({ message: "Erreur: " + err }));
  } else {

    // Updating data sauce when image was not changed
    Sauce.updateOne({ _id: prodId }, { ...req.body, _id: prodId })
      .then(() => {

        // Modify Message if update has partially failed because image was not modify on mimetype error
        const message = req.mimetypeError
          ? "Objet modifié. Erreur: L'image n'as pas été modifiée. Veuillez ajouter une image dans le format correcte: png, jpg, jpeg."
          : "Objet modifié.";
        res.status(200).json({ message: message });
      })
      .catch((err) => res.status(400).json({ message: "Erreur: " + err }));
  }
};
