const express = require("express");
const router = express.Router();
const Listing = require("../models/listing.js");
const Review = require("../models/review.js");
const User = require("../models/user.js");
const trycatch = require("../utill/weapAsync.js");
const passport = require("passport")
const multer  = require('multer');
const {storage}=require('../cloudConfig.js')
const upload = multer({ storage });
const isLogin = (req, res, next) => {
    console.log(req.user);
    if (req.isAuthenticated()) {
        return next();
    }
    req.session.redirectUrl = req.originalUrl;
    req.flash("error", "You must be logged in!");
    return res.redirect("/listings/login");
};
router.use((req, res, next) => {
    res.locals.success =  req.flash("success");
    res.locals.error =  req.flash("error");
    res.locals.currUser =  req.user; // Make flash message available to views
    next();
});

const isReviewAuthor = async (req, res, next) => {
    let { id, reviewid } = req.params;
    let review = await Review.findById(reviewid);
    if (!review.author.equals(res.locals.currUser._id)) {
        req.flash("error", "You are not the creator of this comment");
        return res.redirect(`/listings/${id}/personaldetail`);
    }
    next();
};

const saveAndRedirect = (req, res, next) => {
    res.locals.redirectUrl = req.session.redirectUrl || "/listings";
    next();
};


router.use((req, res, next) => {
    res.locals.currUser = req.user;
    next();
});


router.get("/", trycatch(async (req, res, next) => {
    let list = await Listing.find({});
    res.render("homepage.ejs", { list });
}));


router.get("/:id/personaldetail", trycatch(async (req, res, next) => {
    let { id } = req.params;
    let detail = await Listing.findById(id)
        .populate({
            path: "reviews",
            populate: "author"
        })
        .populate("owner");

    if (!detail) {
        req.flash("error", "No Profile Found");
        return res.redirect("/listings");
    }

    res.render("personaldetail.ejs", { detail });
}));


router.get("/new", isLogin, trycatch(async (req, res, next) => {
    res.render("newform.ejs");
}));

// Route: Create New Listing
router.post("/add", isLogin,upload.single('image'), trycatch(async (req, res, next) => {
     let url=req.file.path;
     let filename=req.file.filename;
    let newListing = new Listing(req.body);
    newListing.owner = req.user._id;
    newListing.image={url,filename};
    await newListing.save();
    req.flash("success", "New Property Added!");
    res.redirect("/listings");
  
}));

// Route: Show Edit Form
router.get("/:id/edit", isLogin, trycatch(async (req, res, next) => {
    let { id } = req.params;
    let detail = await Listing.findById(id);
    if (!detail) {
        req.flash("error", "Listing not found!");
        return res.redirect("/listings");
    }
    res.render("edit.ejs", { detail });
}));


router.put("/:id/edit", isLogin, upload.single('image'), trycatch(async (req, res, next) => {
    let { id } = req.params;
    let detail = await Listing.findById(id);

    if (!detail) {
        req.flash("error", "Listing not found.");
        return res.redirect("/listings");
    }
    let listing = await Listing.findByIdAndUpdate(id, req.body, { new: true });
    if (req.file) {
        let url = req.file.path;
        let filename = req.file.filename;
        listing.image = { url, filename };
    }
    await listing.save();
    req.flash("success", "Update successfully completed.");
    res.redirect(`/listings/${id}/personaldetail`);
}));


// Route: Delete Listing
router.delete("/:id/delete", isLogin, trycatch(async (req, res, next) => {
    let { id } = req.params;
    await Listing.findByIdAndDelete(id);
    req.flash("success", "Listing deleted successfully!");
    res.redirect("/listings");
}));

// Route: Delete Review
router.delete("/:id/delete/:reviewid", isLogin, isReviewAuthor, trycatch(async (req, res, next) => {
    let { id, reviewid } = req.params;
    await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewid } });
    await Review.findByIdAndDelete(reviewid);
    req.flash("success", "Review deleted successfully");
    return res.redirect(`/listings/${id}/personaldetail`);
}));

router.get("/:id/delete/:reviewid", isLogin, isReviewAuthor, trycatch(async (req, res, next) => {
    let { id, reviewid } = req.params;
    await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewid } });
    await Review.findByIdAndDelete(reviewid);
    req.flash("success", "Review deleted successfully");
    return res.redirect(`/listings/${id}/personaldetail`);
}));


// Route: Add Review
router.post("/:id/reviews", isLogin, trycatch(async (req, res, next) => {
    let listing = await Listing.findById(req.params.id);
    let { id } = req.params;

    if (!listing) {
        req.flash("error", "Listing not found!");
        return res.redirect("/listings");
    }

    let newReview = new Review(req.body);
    newReview.author = req.user._id;

    await newReview.save();
    listing.reviews.push(newReview);
    await listing.save();

    req.flash("success", "Your review has been added!");
    return res.redirect(`/listings/${id}/personaldetail`);
}));

// Route: Show Signup Page
router.get("/signUp", trycatch(async (req, res, next) => {
    res.render("signup.ejs");
}));

// Route: Handle Signup
router.post("/signUp", trycatch(async (req, res, next) => {
    try {
        let { username, email, password } = req.body;
        let newUser = new User({ username, email });
        let registeredUser = await User.register(newUser, password);

        req.login(registeredUser, err => {
            if (err) return next(err);
            req.flash("success", "You have been successfully logged in.");
            return res.redirect("/listings");
        });

    } catch (error) {
        req.flash("error", "Username is already used");
        return res.redirect("/listings/signUp");
    }
}));

// Route: Show Login Page
router.get("/login", trycatch(async (req, res, next) => {
    res.render("login.ejs");
}));

// Route: Handle Login
router.post("/login",
    saveAndRedirect,
    passport.authenticate("local", {
        failureRedirect: "/listings/login",
        failureFlash: true,
    }),
    async (req, res, next) => {
        req.flash("success", "You have successfully logged in. Welcome back!");
        let redirectValue = res.locals.redirectUrl;
        return res.redirect(redirectValue);
    }
);

// Route: Handle Logout
router.get("/logout", (req, res, next) => {
    req.logout(err => {
        if (err) return next(err);
        req.flash("success", "You have been successfully logged out.");
        res.redirect("/listings");
    });
});

module.exports = router;
