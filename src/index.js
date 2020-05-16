import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';
import * as firebase from 'firebase';


const config = {
  apiKey: auth.env.REACT_APP_API_KEY,
  authDomain: auth.env.REACT_APP_AUTH_DOMAIN,
  databaseURL: auth.env.REACT_APP_DATABASE_URL,
  projectId: auth.env.REACT_APP_PROJECT_ID,
  storageBucket: auth.env.REACT_APP_STORAGE_BUCKET,
  messagingSenderId: auth.env.REACT_APP_MESSAGING_SENDER_ID,
};

firebase.initializeApp(config);
firebase.analytics();

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
