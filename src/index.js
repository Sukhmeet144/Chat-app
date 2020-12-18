const http = require('http')
const path = require('path')
const express = require('express')
const socketio = require('socket.io')
const app = express()
const Filter = require('bad-words')
const server = http.createServer(app)
const io = socketio(server)
const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')
const {generateMessage , generateLocationMessage}=require('./utils/message')
const {addUser,removeUser,getUser,getUserInRoom} = require('./utils/user')



app.use(express.static(publicDirectoryPath))


io.on('connection', (socket) => {
    console.log('New websocket connection')
  
    socket.on('join', (options, callback)=> {
        const {error, user} =addUser({id: socket.id, ...options})

        if(error){
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage('Admin','Welcome!'))
        socket.broadcast.to(user.room).emit('message',generateMessage(`${user.username} has joined`))
        io.to(user.room).emit('roomData', {
            room : user.room,
            users : getUserInRoom(user.room)
        })


        callback()
    })

    socket.on('sendMessage',(message,callback) =>{
        const user = getUser(socket.id)
        const filter = new Filter()
        if(filter.isProfane(message)){
            return callback('Profanity is not allowed')
        }
        io.to(user.room).emit('message',generateMessage(user.username,message))
        callback()
    })

    socket.on('disconnect',() =>{
        const user= removeUser(socket.id)

        if(user){
            io.to(user.room).emit('message',generateMessage('Admin',`${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                room : user.room,
                users : getUserInRoom(user.room)
            })
        }
    })

    socket.on('sendLocation',(coords,callback) =>{
        const user = getUser(socket.id)
       // io.emit('message',`Location : ${coords.latitude},${coords.longitude}`)
       io.to(user.room).emit('locationMessage',generateLocationMessage(user.username ,`https://google.com/maps?=${coords.latitude},${coords.longitude}`))
        callback()
    })

})

server.listen(port , () => {
    console.log(`Server is up on ${port}`)
})