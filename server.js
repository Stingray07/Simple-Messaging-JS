const express = require("express");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bodyparser = require("body-parser");
const session = require("express-session");
const mongoose = require("mongoose");
const http = require("http");
const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server);
const uri = "mongodb://127.0.0.1:27017/APIdbs";

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
const find = (username) => {
  return new Promise((resolve, reject) => {
    mongoose
      .connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
      .then(() => {
        User.findOne({ username: username })
          .then((user) => {
            if (user) {
              resolve(user);
            } else {
              resolve(null);
            }
          })
          .catch((error) => {
            console.log(error);
            reject(error);
          });
      })
      .catch((error) => {
        console.log(error);
        reject(error);
      });
  });
};

passport.use(
  new LocalStrategy((username, password, done) => {
    console.log("UIsername: " + username);
    console.log("Password: " + password);
    find(username)
      .then((user) => {
        if (user) {
          console.log("User found");
          done(null, user);
        } else {
          done(null, false, { message: "Invalid Credentials" });
        }
      })
      .catch((error) => {
        console.log(error);
        done(error);
      });
  })
);

passport.serializeUser((user, done) => {
  if (!user) {
    done(null, false);
  }
  done(null, user);
});

passport.deserializeUser((user, done) => {
  if (!user) {
    done(null, false);
  }
  find(user.username)
    .then((user) => {
      if (user) {
        done(null, user);
      } else {
        done(null, false, { message: "Invalid Credentials" });
      }
    })
    .catch((error) => {
      console.log(error);
      done(error);
    });
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

app.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      return next(err);
    }

    if (!user) {
      return res.redirect("/test");
    }

    req.login(user, (err) => {
      if (err) {
        return next(err);
      }
      req.session.user = user;
      return res.redirect("/home");
    });
  })(req, res, next);
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
  console.log("REGISTER GET");
});

app.get("/test", (req, res) => {
  res.render("test.ejs");
});

app.post("/register", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  find(username)
    .then((user) => {
      if (user) {
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
    });
});

app.get("/home", ensureAuthenticated, (req, res) => {
  if (req.body.reason === "get_user") {
    res.send({ user: req.session.user });
  } else {
    res.render("home.ejs", { user: JSON.stringify(req.session.user) });
    console.log("HOME GET");
    console.log(req.session.user);
  }
});

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("chat", (message) => {
    console.log("RECEIVED MESSAGE: " + message);
    io.emit("chat", message);
  });
});

app.post("/home", ensureAuthenticated, (req, res) => {
  res.send({ user: req.session.user });
});

server.listen(5000, () => {
  console.log("Server listening at port 5000");
});
