package paint

import akka.actor.{Actor, ActorRef}

import scala.util.parsing.json.JSON

object User {
  type Id = String
  case class Connected(outActor: ActorRef)
  case class IncomingMessage(text: String)
  case class OutgoingMessage(text: String)
}

class User(room: ActorRef, eventStore: ActorRef) extends Actor {
  import User._
  var name: String = ""

  def receive: Receive = {
    case Connected(outActor) =>
      context.become(connected(outActor))
  }

  def connected(outgoing: ActorRef): Receive = {
    room ! Room.Join(this)

    {
      case IncomingMessage(text) =>
        name = Parser.parseCursorOwner(text)
        if (Parser.parseEventType(text) == "getEvents") {
          eventStore ! self
        } else {
          room ! Room.Message(text)
        }

      case messageList: List[Room.Message] =>
        outgoing ! OutgoingMessage(s"""{"eventType": "bulkDraw", "events": [${messageList.map(_.message).mkString(",")}]}""")

      case Room.Message(text) =>
        if (Parser.parseCursorOwner(text) != name) {
          outgoing ! OutgoingMessage(text)
        }

      case Room.Disconnected(user: User) =>
        outgoing ! OutgoingMessage(s"""{"eventType": "disconnected", "cursorOwner": "${user.name}"}""")
    }
  }
}