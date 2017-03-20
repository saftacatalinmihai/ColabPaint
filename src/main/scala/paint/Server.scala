package paint

import akka.NotUsed
import akka.actor._
import akka.http.scaladsl._
import akka.http.scaladsl.model.ws.{Message, TextMessage}
import akka.http.scaladsl.server.Directives._
import akka.stream._
import akka.stream.scaladsl._

import scala.concurrent.Await
import scala.concurrent.duration._
import scala.io.StdIn

object Server {
  def main(args: Array[String]): Unit = {
    implicit val system = ActorSystem()
    implicit val materializer = ActorMaterializer()

    val roomActor = system.actorOf(Props[Room])

    def newUser(): Flow[Message, Message, NotUsed] = {

      val userActor = system.actorOf(Props(new User(roomActor)))

      val incomingMessages: Sink[Message, NotUsed] =
        Flow[Message].map {
          case TextMessage.Strict(event) =>
            User.IncomingEvent(event)
        }.to(Sink.actorRef[User.IncomingEvent](userActor, PoisonPill))

      val outgoingMessages: Source[Message, NotUsed] =
        Source.actorRef[User.OutgoingEvent](10000, OverflowStrategy.dropTail)
        .mapMaterializedValue{ outActorRef =>
          userActor ! User.Connected(outActorRef)
          NotUsed
        }.map((outEvent: User.OutgoingEvent) => TextMessage(outEvent.ev))

      Flow.fromSinkAndSource(incomingMessages, outgoingMessages)
    }

    val route =
      path("paint") {
        get {
          handleWebSocketMessages(newUser())
        }
      } ~
      pathPrefix("static") {
        encodeResponse {
          getFromResourceDirectory("static")
        }
      } ~ getFromResource("static/index.html")
    val binding = Await.result(Http().bindAndHandle(route, "0.0.0.0", 8080), 3.seconds)

    // the rest of the sample code will go here
    println("Started server at 127.0.0.1:8080, press enter to kill server")
    StdIn.readLine()
    system.terminate()
  }
}