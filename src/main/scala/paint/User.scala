package paint

import akka.actor.{Actor, ActorRef}
import Parser._

object User {
  case class Connected(outActor: ActorRef)
  case class IncomingMessage(event: String)
  case class OutgoingMessage(event: String)
}

class User(room: ActorRef, eventStore: ActorRef) extends Actor {
  import User._
  var name: String = ""

  def receive: Receive = {
    case Connected(outActor) =>
      context become connected(outActor)
  }

  def connected(outgoing: ActorRef): Receive = {
    room ! Room.Join(this)

    {
      case IncomingMessage(event) =>
        name = event.get("cursorOwner")
        if (event.get[String]("eventType") == "getEvents") {
          eventStore ! self
        } else {
          room ! Room.Message(event)
        }

      case messageList: List[Room.Message] =>
        outgoing ! OutgoingMessage(s"""{"eventType": "bulkDraw", "events": [${messageList.map(_.message).mkString(",")}]}""")

      case Room.Message(event) =>
        if (event.get[String]("cursorOwner") != name) {
          outgoing ! OutgoingMessage(event)
        }

      case Room.Disconnected(user: User) =>
        outgoing ! OutgoingMessage(s"""{"eventType": "disconnected", "cursorOwner": "${user.name}"}""")
    }
  }
}