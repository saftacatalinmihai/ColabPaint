package paint

import akka.actor.ActorRef
import akka.persistence.PersistentActor

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
    val (eventType, ev) = Parser.parseEventType(event) -> event
    if (eventType == "reset") {
      canvases = events :: canvases
      events = List.empty
    } else {
      events = eventType -> ev :: events
    }
  }

  override def receiveCommand: Receive = {
    case event: String => persist(event)(updateState)
    case userActor: ActorRef => sendDrawEventsTo(userActor)
    case Shutdown => context.stop(self)
  }

  override def receiveRecover: Receive = {
    case event: Event => updateState(event)
  }

  private def sendDrawEventsTo(user: ActorRef): Unit = {
    val drawEvents = events.filter { case (evType, _) =>
      List("bulkDraw", "newCursor", "cursorDown", "cursorMove", "cursorUp", "disconnected").contains(evType)
    }
    println(s"Sending ${drawEvents.length} events to user")
    user ! drawEvents.reverse.map(ev => Room.Message(ev._2))
//    drawEvents.reverse.foreach(ev => user ! Room.Message(ev._2))
  }

}
