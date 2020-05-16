import React from 'react';
import logo from './logo.svg';
import './App.css';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';
import 'bootstrap/dist/css/bootstrap.min.css';
import {db} from './index';

//Alert for bad text in the room name input


class NameForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      value: '',
      alertVisible: false,
      alertText: "Placeholder Alert"
    };

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleChange(event) {
    this.setState({value: event.target.value});
  }

  handleSubmit(event) {

    if (this.state.value === '' || this.state.value === null){

      this.setState({alertVisible: true});
      this.setState({alertText: "Field cannot be left blank."});
    }
    else {
      const roomRef = db.collection('rooms').add({
        room_name: this.state.value,
        user: "test",
      });
      console.log("Sent data to database for new room");
    }
    event.preventDefault();
  }



  render() {
    return (
      <form onSubmit={this.handleSubmit}>
      <div className="roomCreation">
        {this.state.alertVisible && (<Alert variant="danger">{this.state.alertText}</Alert>)}
        {!this.state.alertVisible && (<Alert variant="danger" style={{visibility:"hidden"}}>{this.state.alertText}</Alert>)}
        <input className="createInput" type="text" value={this.state.value} onChange={this.handleChange} placeholder="Room Name" />
        <Button className="createBtn" variant="outline-success" type="submit" >Create Room</Button>{' '}
      </div>
      </form>
    );
  }
}


function App(){
  return(
    <div className="App">
      <header className="App-header">Real-Time Bingo Online</header>
      <NameForm/>

    </div>
  );

}

//original for reference
// function App() {
//   return (
//     <div className="App">
//       <header className="App-header">
//         <img src={logo} className="App-logo" alt="logo" />
//         <p>
//           Edit <code>src/App.js</code> and save to reload.
//         </p>
//         <a
//           className="App-link"
//           href="https://reactjs.org"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           Learn React
//         </a>
//       </header>
//     </div>
//   );
// }

export default App;
