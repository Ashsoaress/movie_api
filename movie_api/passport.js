const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const Models = require('./models.js');
const passportJWT = require('passport-jwt');

let Users = Models.User;
let JWTStrategy = passportJWT.Strategy;
let ExtractJWT = passportJWT.ExtractJwt;

passport.use(
  new LocalStrategy(
    {
      usernameField: 'username',
      passwordField: 'password',
    },
    (username, password, done) => {
      console.log(username + '  ' + password);
      Users.findOne({ username: username }).exec()
        .then((user) => {
          if (!user) {
            console.log('incorrect username');
            return done(null, false, { message: 'Incorrect username.' });
          }

          if (!user.validatePassword(password)) {
            console.log('incorrect password');
            return done(null, false, { message: 'Incorrect password.' });
          }

          console.log('finished');
          return done(null, user);
        })
        .catch((error) => {
          console.log(error);
          return done(error);
        });
    }
  )
);

passport.use(
  new JWTStrategy(
    {
      jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
      secretOrKey: 'your_jwt_secret',
    },
    (jwtPayload, done) => {
      Users.findById(jwtPayload._id)
        .then((user) => {
          return done(null, user);
        })
        .catch((error) => {
          return done(error);
        });
    }
  )
);
