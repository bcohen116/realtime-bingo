import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';
import firebase from 'firebase/app';
import "firebase/auth"
import "firebase/analytics"
import "firebase/firestore";
import {Route, Link, Router, Switch} from 'react-router-dom'
import Upload from './upload'
import Notfound from './notfound'
import Bingo from './bingo'
import history from './history';


const config = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGEING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

const app = firebase.initializeApp(config);
firebase.analytics();
export const db = firebase.firestore();
export default firebase;


//Give user permission to access the data
firebase.auth().signInAnonymously().catch(function(error) {
  // Handle Errors here.
  var errorCode = error.code;
  var errorMessage = error.message;
  console.log("Error authenticating users for Firebase. Error returned: " + error.code + ": " + error.message);
});

firebase.auth().onAuthStateChanged(function(user) {
  if (user) {
    // User is signed in.
    var isAnonymous = user.isAnonymous;
    var uid = user.uid;
    console.log("User signed in");
  } else {
    // User is signed out.

  }

});

ReactDOM.render(
  <Router  history={history}>
  <React.StrictMode>
    <Switch>
       <Route exact path="/" component={App} />
       <Route path="/upload/:room_name" component={Upload}/>
       <Route path="/room/:room_name" component={Bingo}/>
       <Route component={Notfound} />
    </Switch>

  </React.StrictMode>
  </Router>,
  document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
