const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const app = express();
const uuid = require('uuid');

const mongoose = require('mongoose');
const Models = require('./models.js');

const Movies=Models.Movie;
const Users=Models.User;
const Genres=Models.Genre;
const Directors=Models.Director;
const cors = require('cors');
app.use(cors({ origin: '*' }))

// Middleware
app.use(express.static('public'));
app.use(express.json());
app.use(morgan('tiny'));
app.use(bodyParser.json());

const { check, validationResult } = require('express-validator');

let auth = require('./auth')(app);
const passport = require('passport');
require('./passport');

mongoose.connect(process.env.CONNECTION_URI, { useNewUrlParser: true, useUnifiedTopology: true });

let logger = (req, res, next) => {
  console.log(req.url);
  next();
};

app.use(logger);

app.get('/', (req, res) => {
  res.send('Welcome to myFlix!');
});




// READ
//Get movies
app.get('/movies',passport.authenticate('jwt', { session: false }), (req, res) => {
    Movies.find()
      .then((movies) => {
        res.status(201).json(movies);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send('Error: ' + err);
      });
  });
// Get all users
app.get('/users', passport.authenticate('jwt', { session: false }),(req, res) => {
    Users.find()
      .then((users) => {
        res.status(201).json(users);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send('Error: ' + err);
      });
  });

//searches for movies by their title and returns a  single JSON object
app.get('/movies/:title', passport.authenticate('jwt', { session: false }),(req, res) => {
    Movies.findOne({ Title: req.params.title })
      .then((movies) => {
        res.status(200).json(movies);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send('Error: ' + err);
      });
  });

//searches for movies by their genre and returns a JSON object
app.get('/movies/genres/:genreName', passport.authenticate('jwt', { session: false }),(req, res) => {
    Movies.find({ 'Genre.Name': req.params.genreName })
      .then((movies) => {
        res.status(200).json(movies);
      })
      .catch((err) => {
        res.status(500).send('Error: ' + err);
      });
  });
  
  //searches for movies by the directors name and returns the movies with that directors name
  app.get('/movies/directors/:directorsName', passport.authenticate('jwt', { session: false }),(req, res) => {
    Movies.find({ 'Director.Name': req.params.directorsName })
      .then((movies) => {
        res.status(200).json(movies);
      })
      .catch((err) => {
        res.status(500).send('Error: ' + err);
      });
  });
//creates a new user and adds them to the list of users.
app.post('/users',
  [
    check('username', 'Username is required').isLength({min: 5}),
    check('username', 'Username contains non alphanumeric characters - not allowed.').isAlphanumeric(),
    check('password', 'Password is required').not().isEmpty(),
    check('Email', 'Email does not appear to be valid').isEmail()
  ], (req, res) => {

  // check the validation object for errors
    let errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

  let hashedPassword = Users.hashPassword(req.body.password);
  Users.findOne({ username: req.body.username }).then((existingUser) => {
    if (existingUser) {
      return res.status(400).send(req.body.Name + ' already exists');
    }

    return Users.create({
      username: req.body.username,
      password: hashedPassword,
      Name: req.body.Name,
      Email: req.body.Email
    }).then((newUser) => {
      res.status(201).json(newUser);
    });
  })
  .catch((error) => {
    console.error(error);
    res.status(500).send('Error: ' + error);
  });
});
  
  //allows users to save movies to their favorites!
  app.post('/users/:username/movies/:MovieID', passport.authenticate('jwt', { session: false }),(req, res) => {
    Users.findOneAndUpdate(
      { username: req.params.username },
      {
        $addToSet: { FavoriteMovies: req.params.MovieID }
      },
      { new: true } //This line makes sure the updated document is returned
    )
      .then((updatedUser) => {
        if (!updatedUser) {
          return res.status(404).send("Error: User doesn't exist");
        } else {
          res.json(updatedUser);
        }
      })
      .catch((error) => {
        console.error(error);
        res.status(500).send('Error: ' + error);
      });
  });
  
  //deletes a user by username
  app.delete('/users/:username', (req, res) => {
    Users.findOneAndRemove({ username: req.params.username })
      .then((user) => {
        if (!user) {
          res.status(400).send(req.params.username + ' was not found');
        } else {
          res.status(200).send(req.params.username + ' was deleted');
        }
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send('Error: ' + err);
      });
  });
  
  //allows users to delete movies from their favorites
  app.delete('/users/:username/movies/:MovieID', passport.authenticate('jwt', { session: false }),(req, res) => {
    Users.findOneAndUpdate(
      { username: req.params.username },
      {
        $pull: { FavoriteMovies: req.params.MovieID }
      },
      { new: true }
    )
      .then((updatedUser) => {
        if (!updatedUser) {
          return res.status(404).send("Error: User doesn't exist");
        } else {
          res.json(updatedUser);
        }
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send('Error: ' + err);
      });
  });
  
//updates a account holders information
app.put('/users/:username', passport.authenticate('jwt', { session: false }),(req, res) => {
    Users.findOneAndUpdate(
      { username: req.params.username },
      {
        $set: {
          username: req.body.username,
          password: req.body.password,
          Name: req.body.name,
          Email: req.body.Email,
          Gender: req.body.Gender,
          Birthday: req.body.Birthday,
          Address: req.body.Address,
          Phone: req.body.Phone
        }
      },
      { new: true }
    )
      .then((updatedUser) => {
        if (!updatedUser) {
          return res.status(404).send("Error: User doesn't exist");
        } else {
          res.json(updatedUser);
        }
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send('Error: ' + err);
      });
  });


app.use(express.static('public'));

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Error!');
});

  
// Start the server
const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0',() => {
 console.log('Listening on Port ' + port);
});


