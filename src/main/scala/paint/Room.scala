package paint

import akka.actor._

object Room {
  case class Join(user: User)
  case class Disconnected(user: User)
  case class Event(event: String)
}

class Room extends Actor {
  import Room._
  var users: Set[(ActorRef, User)] = Set.empty

  def receive: Receive = {
    case Join(user) =>
      users += ((sender(), user))
      // we also would like to remove the user when its actor is stopped
      context.watch(sender())

    case Terminated(userActor) =>
      users.find(_._1.equals(userActor)) foreach {
        case (userActorRef, user) =>
          users -= ((userActorRef, user))
          users.foreach(_._1 ! Disconnected(user))
      }

    case msg: Event =>
      users.foreach(_._1 ! msg)
  }
}