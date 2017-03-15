package paint

import akka.actor.{Actor, ActorRef}
import scala.util.parsing.json.JSON

/**
  * Created by casafta on 15/3/2017.
  */
class EventStore extends Actor {

  var events: List[(String, String)] = List.empty

  override def receive: Receive = {
    case userActor: ActorRef => sendDrawEventsTo(userActor)
    case event: String => events =
      (JSON.parseFull(event).get.asInstanceOf[Map[String, Any]]("msgType").asInstanceOf[String], event) :: events
  }

  private def sendDrawEventsTo(user: ActorRef): Unit = {
    val drawEvents = events.filter { case (evType, _) =>
      List("cursorDown", "cursorMove", "cursorUp").contains(evType)
    }
    println(s"Sending ${drawEvents.length} events to user")
    user ! drawEvents.reverse.map(ev => Room.Message(ev._2))
//    drawEvents.reverse.foreach(ev => user ! Room.Message(ev._2))
  }

}
