package paint

import akka.actor.{Actor, ActorRef}
import scala.util.parsing.json.JSON

/**
  * Created by casafta on 15/3/2017.
  */
class EventStore extends Actor {

  var canvases: List[List[(String, String)]] = List.empty
  var events: List[(String, String)] = List.empty

  override def receive: Receive = {
    case userActor: ActorRef => sendDrawEventsTo(userActor)
    case event: String =>
      val (msgType, ev) = (parseMsgType(event), event)
      if (msgType == "reset ") {
        canvases = events :: canvases
        events = List.empty
      } else {
        events = (msgType, ev) :: events
      }
  }

  private def sendDrawEventsTo(user: ActorRef): Unit = {
    val drawEvents = events.filter { case (evType, _) =>
      List("cursorDown", "cursorMove", "cursorUp").contains(evType)
    }
    println(s"Sending ${drawEvents.length} events to user")
    user ! drawEvents.reverse.map(ev => Room.Message(ev._2))
//    drawEvents.reverse.foreach(ev => user ! Room.Message(ev._2))
  }

  def parseMsgType(event: String): String = JSON.parseFull(event).get.asInstanceOf[Map[String, Any]]("msgType").asInstanceOf[String]

}
