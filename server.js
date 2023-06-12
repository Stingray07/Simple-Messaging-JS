const express = require("express");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bodyparser = require("body-parser");
const session = require("express-session");
const mongoose = require("mongoose");
const http = require("http");

const app = express();
const uri = "mongodb://127.0.0.1:27017/APIdbs";
const server = http.createServer(app);

app.set("view-engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(bodyparser.json());
app.use(
  session({
    secret: "tally",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.session());
app.use(passport.initialize());

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    password: { type: String, required: true },
  },
  { collection: "user_pass_collection" }
);
const User = mongoose.model("User", userSchema);
const find = (username, password) => {
  mongoose
    .connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
      User.findOne({ username: username }).then((user) => {
        if (user) {
          return true;
        }
      });
    });
};

passport.use(
  new LocalStrategy((username, password, done) => {
    mongoose
      .connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
      .then(() => {
        User.findOne({ username: username })
          .then((user) => {
            if (user) {
              if (password === user.password) {
                console.log("User found: ", user);
                done(null, user);
              } else {
                console.log("User not found");
                done(null, false, { message: "Invalid Credentials" });
              }
            } else {
              console.log("User not found");
              done(null, false, { message: "Invalid Credentials" });
            }
          })
          .catch((error) => {
            console.error(error);
            done(error);
          });
      });
  })
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((user, done) => {
  mongoose
    .connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
      User.findOne({ username: user.username })
        .then((user) => {
          if (user) {
            done(null, user);
          } else {
            done(null, false, { message: "Invalid Credentials" });
          }
        })
        .catch((error) => {
          console.error(error);
          done(error);
        });
    });

  if (!user) {
    return done(new Error("USER NOT FOUND"));
  }

  done(null, user);
});

const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
};

app.get("/login", (req, res) => {
  res.render("login.ejs");
  console.log("LOGIN GET");
});

app.get("/", (req, res) => {
  res.redirect("/login");
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/home",
    failureRedirect: "/test",
  })
);

app.get("/register", (req, res) => {
  res.render("register.ejs");
  console.log("REGISTER GET");
});

app.get("/test", (req, res) => {
  res.render("test.ejs");
});

app.post("/register", (req, res, done) => {
  const username = req.body.username;
  const password = req.body.password;

  mongoose
    .connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
      User.findOne({ username: username })
        .then((user) => {
          if (user && username === user.username) {
            console.log("Username already taken");
            return res.send({ message: "Username already taken" });
          } else {
            const newUser = new User({
              username: username,
              password: password,
            });
            res.send("User successfully created");
            return newUser.save();
          }
        })
        .catch((error) => {
          console.error(error);
          done(error);
        });
    })
    .catch((error) => console.error(error));
});

app.get("/home", ensureAuthenticated, (req, res) => {
  res.render("home.ejs");
  console.log("HOME GET");
});

server.listen(5000, () => {
  console.log("Server listening at port 5000");
});
