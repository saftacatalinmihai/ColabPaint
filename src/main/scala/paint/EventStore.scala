package paint

import java.io.{BufferedWriter, File, FileWriter}

import scala.concurrent.ExecutionContext.Implicits.global
import akka.actor.{Actor, ActorRef}

import scala.concurrent.Future
import scala.util.Try
import akka.persistence.{PersistentActor, SnapshotOffer}

import scala.util.parsing.json.JSON

/**
  * Created by casafta on 15/3/2017.
  */
case object Shutdown
class EventStore extends PersistentActor {
  type EventType = String
  type Event = String
  type TypedEvent = (EventType, Event)

  type EventList = List[TypedEvent]
  type Canvases = List[EventList]

  type State = (Canvases, EventList)

  var canvases: Canvases = List.empty
  var events: EventList = List.empty

  override def persistenceId: String = "id-1"

  def updateState(event: Event): Unit = {
    val (msgType, ev) = (parseMsgType(event), event)
    if (msgType == "reset") {
      canvases = events :: canvases
      events = List.empty
    } else {
      events = (msgType, ev) :: events
    }
  }

  override def receiveCommand: Receive = {
    case "snap" => saveSnapshot((canvases, events))
    case event: String => persist(event)(updateState)
    case userActor: ActorRef => sendDrawEventsTo(userActor)
    case Shutdown => context.stop(self)
  }

  override def receiveRecover: Receive = {
    case event: Event => updateState(event)
    case SnapshotOffer(_, snapshot: State) =>
      println(s"offered state = $snapshot")
      canvases =  snapshot._1
      events = snapshot._2
  }

  private def sendDrawEventsTo(user: ActorRef): Unit = {
    val drawEvents = events.filter { case (evType, _) =>
      List("newCursor", "cursorDown", "cursorMove", "cursorUp").contains(evType)
    }
    println(s"Sending ${drawEvents.length} events to user")
    user ! drawEvents.reverse.map(ev => Room.Message(ev._2))
//    drawEvents.reverse.foreach(ev => user ! Room.Message(ev._2))
  }

  def parseMsgType(event: String): String = JSON.parseFull(event).get.asInstanceOf[Map[String, Any]]("msgType").asInstanceOf[String]

}
