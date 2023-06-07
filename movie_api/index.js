const express = require('express'),
bodyParser = require('body-parser'),
   uuid = require('uuid'),
   morgan = require('morgan'),
   fs = require('fs'),
   path = require('path');

const app = express();

//create a write stream (in append mode)
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'log.txt'), {flags: 'a'})

//set up the logger
app.use(morgan('combined',{stream: accessLogStream}));

let users = [
    {
        id: 1,
        name: 'Jane',
        favouriteMovies: []
    },

    {
        id: 2,
        name: 'Joe',
        favouriteMovies: ['Interstellar']
    }
]

let movies = [
    {
        Title: 'The Godfather',
        Genre: {
            Name: 'Crime',
            Description: 'Crime films, in the broadest sense, are a cinematic genre inspired by and analogous to the crime fiction literary genre.'
        },
        Description: 'The aging patriarch of an organized crime dynasty in postwar New York City transfers control of his clandestine empire to his reluctant youngest son.',
        Director: {
            Name: 'Francis Ford Coppola',
            Born: 'April 7th, 1939',
            Bio: 'Francis Ford Coppola is an American film director, producer, and screenwriter.'
        }
    },

    {
        Title: 'The Shawshank Redemption',
        Genre: {
            Name: 'Drama',
            Description: 'In film and television, drama is a category or genre of narrative fiction (or semi-fiction) intended to be more serious than humorous in tone.'
        },
        Description: 'Over the course of several years, two convicts form a friendship, seeking consolation and, eventually, redemption through basic compassion.',
        Director: {
            Name: 'Frank Darabont',
            Born: 'January 28, 1959',
            Bio: 'Frank Árpád Darabont is a French-born American film director, screenwriter and producer.'
        }
    },

    {
        Title: 'The Dark Knight',
        Genre: {
            Name: 'Action',
            Description: 'Action movies usually involve high-energy, physical stunts and chases, and may or may not have a lot of dialogue.'
        },
        Description: 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.',
        Director: {
            Name: 'Christopher Nolan',
            Born: 'July 30, 1970',
            Bio: 'Acclaimed writer-director best known for his cerebral, often nonlinear, storytelling.'
        }
    },

    {
        Title: 'Interstellar',
        Genre: {
            Name:'Sci-Fi',
            Description: 'Science fiction (or sci-fi) is a genre that uses speculative, fictional science-based depictions of phenomena that are not fully accepted by mainstream science, such as extraterrestrial lifeforms, spacecraft, robots, cyborgs, dinosaurs, interstellar travel, time travel, or other technologies.'
        },
        Description: 'When Earth becomes uninhabitable in the future, a farmer and ex-NASA pilot, Joseph Cooper, is tasked to pilot a spacecraft, along with a team of researchers, to find a new planet for humans.',
        Director: {
            Name: 'Christopher Nolan',
            Born: 'July 30, 1970',
            Bio: 'Acclaimed writer-director best known for his cerebral, often nonlinear, storytelling.'
        }
    },

    {
        Title: 'Schindler\'s List ',
        Genre: {
            Name: 'History',
            Description: 'A historical film is a fiction film showing past events or set within a historical period.',
        },
        Description: 'In German-occupied Poland during World War II, industrialist Oskar Schindler gradually becomes concerned for his Jewish workforce after witnessing their persecution by the Nazis.',
        Director: {
            Name: 'Steven Spielberg',
            Born: 'December 18, 1946',
            Bio: 'Hollywood\'s best known director and one of the wealthiest filmmakers in the world.'
        }
    }
];

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.send('Welcome to myFlix!');
});

app.get('/documentation', (req, res) => {
    res.sendFile('public/documentation.html', {root: __dirname});
});

//Return a list of all movies to the user
app.get('/movies', (req, res) => {
    res.status(200).json(movies);
});

//Return data about a single movie by title
app.get('/movies/:title', (req, res) => {
    const { title } = req.params;
    const movie = movies.find( movie => movie.Title === title );

    if (movie) {
        res.status(200).json(movie);
    } else {
        res.status(400).send('no such movie')
    }
});

//Return data about a genre by title
app.get('/movies/genre/:genreName', (req, res) => {
    const { genreName } = req.params;
    const genre = movies.find( movie => movie.Genre.Name === genreName ).Genre;

    if (genre) {
        res.status(200).json(genre);
    } else {
        res.status(400).send('no such genre')
    }
});

//Return data about a director by name
app.get('/movies/directors/:directorName', (req, res) => {
    const { directorName } = req.params;
    const director = movies.find( movie => movie.Director.Name === directorName ).Director;

    if (director) {
        res.status(200).json(director);
    } else {
        res.status(400).send('no such director')
    }
});

//Allow new users to register
app.post('/users', (req, res) => {
    const newUser = req.body;

    if (newUser.name) {
        newUser.id = uuid.v4();
        users.push(newUser);
        res.status(201).json(newUser)
    } else {
        res.status(400).send('users need names')
    }
});

//Allow users to update their user info
app.put('/users/:id', (req, res) => {
    const { id } = req.params;
    const updatedUser = req.body;

    let user = users.find( user => user.id == id );

    if (user) {
        user.name = updatedUser.name;
        res.status(200).json(user);
    } else {
        res.status(400).send('no such user')
    }
});

//Allow users to add a movie to their list of favorites
app.post('/users/:id/:movieTitle', (req, res) => {
    const { id, movieTitle } = req.params;

    let user = users.find( user => user.id == id );

    if (user) {
        user.favouriteMovies.push(movieTitle);
        res.status(200).send(`${movieTitle} has been added to user ${id}'s array`);
    } else {
        res.status(400).send('no such user')
    }
});

//Allow users to remove a movie from their list of favorites
app.delete('/users/:id/:movieTitle', (req, res) => {
    const { id, movieTitle } = req.params;

    let user = users.find( user => user.id == id );

    if (user) {
        user.favouriteMovies = user.favouriteMovies.filter( title => title !== movieTitle);
        res.status(200).send(`${movieTitle} has been removed from user ${id}'s array`);
    } else {
        res.status(400).send('no such user')
    }
});

//Allow existing users to deregister
app.delete('/users/:id', (req, res) => {
    const { id } = req.params;

    let user = users.find( user => user.id == id );

    if (user) {
        users = users.filter( user => user.id != id);
        res.status(200).send(`user ${id} has been deleted`);
    } else {
        res.status(400).send('no such user')
    }
});

//error-handling function
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

//listen for requests
app.listen(8080, () => {
    console.log('Your app is listening on port 8080.');
});




