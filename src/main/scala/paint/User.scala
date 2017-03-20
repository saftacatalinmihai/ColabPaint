package paint

import akka.actor.{Actor, ActorRef}

/**
  * Created by casafta on 20/3/2017.
  */

object User {
  case class IncomingEvent(ev: String)
  case class OutgoingEvent(ev: String)
  case class Connected(out: ActorRef)
}

class User(room: ActorRef) extends Actor{
  import User._
  def receive: Receive = {
    case Connected(outActor) =>
      context become connected(outActor)
  }

  def connected(out: ActorRef): Receive = {
    room ! Room.Join

    {
      case IncomingEvent(event) =>
        room ! Room.Event(event)
      case Room.Event(event) =>
        out ! OutgoingEvent(event)
    }
  }
}
