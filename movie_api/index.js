const express = require('express'),
  morgan = require('morgan'),
  fs = require('fs'),
  path = require('path'),
  bodyParser = require('body-parser'),
  uuid = require('uuid'),
  { check, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Models = require('./models');

const Movies = Models.Movie;
const Users = Models.User;

 //mongoose.connect('mongodb://localhost:27017/myFlixDB', { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.connect( process.env.CONNECTION_URI, { useNewUrlParser: true, useUnifiedTopology: true });


const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const cors = require('cors');
let allowedOrigins = ['http://localhost:8080', 'http://testsite.com'];
app.use(cors());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      let message = 'The CORS policy for this application doesn’t allow access from origin ' + origin;
      return callback(new Error(message), false);
    }
    return callback(null, true);
  }
}));

let auth = require('./auth')(app);
const passport = require('passport');
require('./passport');


// Logger Initiated
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'log.txt'), { flags: 'a' });
app.use(morgan('combined', { stream: accessLogStream }));

app.use(express.static('public'));

//displaying a welcome message on the home page
app.get('/', (req, res) => {
  res.send('Welcome to my myFlix!');
});

//displaying a list of all movies
app.get('/movies', passport.authenticate('jwt', { session: false }), (req, res) => {
  Movies.find()
    .then((movies) => {
      res.status(200).json(movies);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

//displaying data about a single movie by movie title
app.get('/movies/:title', passport.authenticate('jwt', { session: false }), (req, res) => {
  Movies.findOne({ title: req.params.title })
    .then((movie) => {
      if (!movie) {
        return res.status(404).send('Error: ' + req.params.title + ' was not found');
      }
      res.status(200).json(movie);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

// displaying data about a genre by genre name
app.get('/movies/genreInfo/:genre',  (req, res) => {
  Movies.findOne({ 'genre.name': req.params.genre })
    .then((movie) => {
      if (!movie) {
        return res.status(404).send('Error: ' + req.params.genre + ' was not found');
      } else {
        res.status(200).json(movie.genre.description);
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

// displaying data about a director by name
app.get('/movies/directorInfo/:director', passport.authenticate('jwt', { session: false }), (req, res) => {
  Movies.findOne({ 'director.name': req.params.director })
    .then((movie) => {
      if (!movie) {
        return res.status(404).send('Error: ' + req.params.director + ' was not found');
      } else {
        res.status(200).json(movie.director);
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

// diplaying movies by genre 
app.get('/movies/genre/:genre', passport.authenticate('jwt', { session: false }), (req, res) => {
  Movies.find({ 'genre.name': req.params.genre })
    .then((movies) => {
      if (movies.length == 0) {
        return res.status(404).send('Error: no movies found with the ' + req.params.genre + ' genre type.');
      } else {
        res.status(200).json(movies);
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

// displaying movies by director
app.get('/movies/directors/:director', passport.authenticate('jwt', { session: false }), (req, res) => {
  Movies.find({ 'director.name': req.params.director })
    .then((movies) => {
      if (movies.length == 0) {
        return res.status(404).send('Error: no movies found with the director ' + req.params.director + ' name');
      } else {
        res.status(200).json(movies);
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

// displaying a list of all users
app.get('/users', passport.authenticate('jwt', { session: false }), (req, res) => {
  Users.find()
    .then((users) => {
      res.status(200).json(users);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

// display a single user
app.get('/users/:username', passport.authenticate('jwt', { session: false }), (req, res) => {
  Users.findOne({ username: req.params.username })
    .then((user) => {
      if (!user) {
        return res.status(404).send('Error: ' + req.params.name + ' was not found');
      } else {
        res.json(user);
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

//creating a new user
app.post('/users', [
  check('username', 'Username is required').isLength({ min: 5 }),
  check('username', 'Username contains non alphanumeric characters - not allowed.').isAlphanumeric(),
  check('password', 'Password is required').not().isEmpty(),
  check('email', 'Email does not appear to be valid').isEmail()
], (req, res) => {
  let errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  let hashedPassword = Users.hashPassword(req.body.password);
  Users.findOne({ username: req.body.username })
    .then((user) => {
      if (user) {
        return res.status(400).send(req.body.username + ' already exists');
      } else {
        Users
          .create({
            username: req.body.username,
            password: hashedPassword,
            email: req.body.email,
            birthDate: req.body.birthDate
          })
          .then((user) => { res.status(201).json(user) })
          .catch((error) => {
            console.error(error);
            res.status(500).send('Error: ' + error);
          })
      }
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send('Error: ' + error);
    });
});

//adding a movie to a user's favorite list
app.post('/users/:username/movies/:movieID', passport.authenticate('jwt', { session: false }), (req, res) => {
  Users.findOneAndUpdate(
    { username: req.params.username },
    {
      $addToSet: { favoriteMovies: req.params.movieID },
    },
    { new: true }
  )
    .then((updatedUser) => {
      if (!updatedUser) {
        return res.status(404).send('Error: User was not found');
      } else {
        res.json(updatedUser);
      }
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send('Error: ' + error);
    });
});

//updating a user's information
app.put('/users/:username', passport.authenticate('jwt', { session: false }),
  [
    check('username', 'Username is required').isLength({ min: 5 }),
    check('username', 'Username contains non alphanumeric characters - not allowed.').isAlphanumeric(),
    check('password', 'Password is required').not().isEmpty(),
    check('email', 'Email does not appear to be valid').isEmail()
  ], (req, res) => {
    let errors = validationResult(req);
    let hashedPassword = Users.hashPassword(req.body.password);
    Users.findOneAndUpdate(
      { username: req.params.username },
      {
        $set: {
          username: req.body.username,
          password: hashedPassword,
          email: req.body.email,
          birthDate: req.body.birthDate
        },
      },
      { new: true }
    )
      .then((user) => {
        if (!user) {
          return res.status(404).send('Error: No user was found');
        } else {
          res.json(user);
        }
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send('Error: ' + err);
      });
  });


//removing a movie from a user's favorite list
app.delete('/users/:username/movies/:movieID', passport.authenticate('jwt', { session: false }), (req, res) => {
  Users.findOneAndUpdate(
    { username: req.params.username },
    {
      $pull: { favoriteMovies: req.params.movieID },
    },
    { new: true }
  )
    .then((updatedUser) => {
      if (!updatedUser) {
        return res.status(404).send('Error: User not found');
      } else {
        res.json(updatedUser);
      }
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send('Error: ' + error);
    });
});

//removing an existing user
app.delete('/users/:username', passport.authenticate('jwt', { session: false }), (req, res) => {
  Users.findOneAndRemove({ username: req.params.username })
    .then((user) => {
      if (!user) {
        res.status(404).send('User ' + req.params.username + ' was not found');
      } else {
        res.status(200).send(req.params.username + ' was deleted.');
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

//displaying documentation
app.use(express.static('documentation.html'));
app.get('/documentation', (req, res) => {
  res.sendFile('public/documentation.html', { root: __dirname });
});


//error-handling middleware function
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

//creating listener on port 80 and displaying a console message upon server startup 
const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0', () => {
  console.log('Listening on Port ' + port);
});
