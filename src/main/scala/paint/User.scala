package paint

import akka.actor.{Actor, ActorRef}

import scala.util.parsing.json.JSON

object User {
  type Id = String
  case class Connected(outgoing: ActorRef)
  case class IncomingMessage(text: String)
  case class OutgoingMessage(text: String)
}

class User(chatRoom: ActorRef) extends Actor {
  import User._
  var name: String = ""

  def receive: Receive = {
    case Connected(outgoing) =>
      context.become(connected(outgoing))
  }

  def connected(outgoing: ActorRef): Receive = {
    chatRoom ! Room.Join(this)

    {
      case IncomingMessage(text) =>
        name = cursorOwner(text)
        chatRoom ! Room.ChatMessage(text)

      case Room.ChatMessage(text) =>
        if (cursorOwner(text) != name) {
          outgoing ! OutgoingMessage(text)
        }

      case Room.Disconnected(user: User) =>
        outgoing ! OutgoingMessage(s"""{"msgType": "disconnected", "cursorOwner": "${user.name}"}""")
    }
  }

  private def cursorOwner(text: String) = {
    JSON.parseFull(text).get.asInstanceOf[Map[String, Any]]("cursorOwner").asInstanceOf[String]
  }
}