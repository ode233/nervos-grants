pragma solidity >=0.8.0;

contract SimpleDrawing {
  string drawingData;

  constructor(string memory x) payable {
    drawingData = x;
  }

  function set(string memory x) public payable {
    drawingData = x;
  }

  function get() public view returns (string memory) {
    return drawingData;
  }
}