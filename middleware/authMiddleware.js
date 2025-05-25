const jwt = require('jsonwebtoken');
require('dotenv').config();

function authenticateToken(req, res, next) {
    const token = req.cookies.auth_token || req.headers['authorization']?.split(' ')[1];
    if (!token) return res.redirect('/');

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.redirect('/');
        req.user = user;
        next();
    });
}

module.exports = authenticateToken;
