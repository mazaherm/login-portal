const createError = require('http-errors')
const express = require('express')
const path = require('path')
const logger = require('morgan')
const session = require('express-session')
const okta = require("@okta/okta-sdk-nodejs");
const ExpressOIDC = require("@okta/oidc-middleware").ExpressOIDC;

const dashboardRouter = require('./routes/dashboard')
const publicRouter = require('./routes/public')
const userRouter = require('./routes/users')

const app = express()
const oktaClient = new okta.Client({
  orgUrl: 'https://dev-182707.oktapreview.com',
  token: '00MCWaBQjHVb6j9ebOE6x-SMQgrawH6hPMBKdf_L1Z'
})
const oidc = new ExpressOIDC({
  issuer: 'https://dev-182707.oktapreview.com/oauth2/default',
  client_id: '0oaglwhiqirO2e2Vm0h7',
  client_secret: '8eBfAHRNJjxtdFBD_b_i-r1zPLHw7m-EBCFX3ZDl',
  redirect_uri: 'http://localhost:3000/users/callback',
  scope: 'openid profile',
  routes: {
    login: {
      path: '/users/login'
    },
    callback: {
      path: '/users/callback',
      defaultRedirect: '/dashboard'
    }
  }
})

// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(express.static(path.join(__dirname, 'public')))
app.use(
  session({
    secret: '8eBfAHRNJjxtdFBD_b_i-r1zPLHw7m-EBCFX3ZD',
    resave: true,
    saveUninitialized: false
  })
)
app.use(oidc.router)
app.use((req, res, next) => {
  if (!req.userinfo) {
    return next()
  }
  oktaClient.getUser(req.userinfo.sub)
    .then(user => {
      req.user = user
      res.locals.user = user
      next()
    }).catch(err => {
      next(err)
    })
})

function loginRequired (req, res, next) {
  if (!req.user) {
    return res.status(401).render('unauthenticated')
  }
  next()
}

app.use('/', publicRouter)
app.use('/dashboard', loginRequired, dashboardRouter)
app.use('/users', userRouter)

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404))
})

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  // render the error page
  res.status(err.status || 500)
  res.render('error')
})

module.exports = app
