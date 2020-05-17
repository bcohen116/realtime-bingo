import React from 'react';
import logo from './logo.svg';
import './App.css';
import {Button, Alert} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import {db} from './index';
import firebase from './index'

//This file contains the actual bingo game code

class Bingo extends React.Component {
  //Props extracts info from the url
  constructor(props) {
    super(props);
    this.state = {
      value: '',
      room_name: decodeURIComponent(props.match.params.room_name)
    };
    console.log("Room name received: " + this.state.room_name);
  }
  render() {
    return(
      <div className="App">
        <header className="App-header">Real-Time Bingo Online</header>


      </div>
    );
  }
}


export default Bingo;
