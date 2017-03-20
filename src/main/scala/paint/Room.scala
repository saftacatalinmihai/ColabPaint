package paint

import akka.actor.{Actor, ActorRef, Terminated}

/**
  * Created by casafta on 20/3/2017.
  */
case object Room {
  case class Event(ev: String)
  case object Join
}

class Room extends Actor {
  import Room._
  var users: Set[ActorRef] = Set.empty

  override def receive = {
    case Join =>
      users += sender()
      context watch sender()

    case Terminated(userActor) =>
      users -= userActor

    case ev: Event =>
      users.foreach(_ ! ev)
  }

}
