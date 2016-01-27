# ET-SSH

A remote management system built on Nodejs and socket.io

## TODO
- [ ] Run everything over HTTPS
- [ ] Retry connecting Websockets if connection lost, and handle for detecting internet connection and begin trying to connect (May be a systemd service?)
- [ ] Figure out how to set SSH username dynamically on session init.
- [ ] Do proper session teardown
  - Remove connection `pipeStruct` from connectedBoxes object on disconnect of box or control.
- [ ] Test large scale (1000+) boxes

## Stretch TODOs
- [ ] User account and favourite boxes
- [ ] Richer metadata on boxes:
  - Last seen
  - SFTP via websockets (copy files by drag and drop)
