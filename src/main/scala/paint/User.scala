package paint

import akka.actor.{Actor, ActorRef}

import scala.util.parsing.json.JSON

object User {
  type Id = String
  case class Connected(outgoing: ActorRef)
  case class IncomingMessage(text: String)
  case class OutgoingMessage(text: String)
}

class User(room: ActorRef) extends Actor {
  import User._
  var name: String = ""

  def receive: Receive = {
    case Connected(outgoing) =>
      context.become(connected(outgoing))
  }

  def connected(outgoing: ActorRef): Receive = {
    room ! Room.Join(this)

    {
      case IncomingMessage(text) =>
        name = cursorOwner(text)
        room ! Room.Message(text)

      case messageList: List[Room.Message] =>
        outgoing ! OutgoingMessage(s"""{"msgType": "bulkDraw", "events": [${messageList.map(_.message).mkString(",")}]}""")

      case Room.Message(text) =>
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