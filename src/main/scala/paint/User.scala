package paint

import akka.actor.{Actor, ActorRef}
import paint.Parser._

object User {
  case class Connected(outActor: ActorRef)
  case class IncomingEvent(event: String)
  case class OutgoingEvent(event: String)
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
      case IncomingEvent(event) =>
        name = event.get("cursorOwner")
        if (event.get[String]("eventType") == "getEvents") {
          eventStore ! self
        } else {
          room ! Room.Event(event)
        }

      case eventList: List[Room.Event] =>
        outgoing ! OutgoingEvent(s"""{"eventType": "bulkDraw", "events": [${eventList.map(_.event).mkString(",")}]}""")

      case Room.Event(event) =>
        if (event.get[String]("cursorOwner") != name) {
          outgoing ! OutgoingEvent(event)
        }

      case Room.Disconnected(user: User) =>
        outgoing ! OutgoingEvent(s"""{"eventType": "disconnected", "cursorOwner": "${user.name}"}""")
    }
  }
}