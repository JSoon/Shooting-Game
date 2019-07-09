module.exports = {
    "env": {
        "browser": true,
        "es6": true
    },
    "extends": "eslint:recommended",
    "globals": {
        "PIXI": "readonly",
        "Bump": "readonly"
    },
    "parserOptions": {
        "ecmaVersion": 6,
        "sourceType": "script"
    },
    "rules": {
        "no-unused-vars": "warn"
    }
};