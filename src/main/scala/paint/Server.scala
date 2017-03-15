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

    val room = system.actorOf(Props(new Room))
    val evStore   = system.actorOf(Props(new EventStore))

    def newUser(): Flow[Message, Message, NotUsed] = {
      // new connection - new user actor
      val userActor = system.actorOf(Props(new User(room)))

      val incomingMessages: Sink[Message, NotUsed] =
        Flow[Message].map {
          // transform websocket message to domain message
          case TextMessage.Strict(text) =>
            evStore ! text
            User.IncomingMessage(text)
        }.to(Sink.actorRef[User.IncomingMessage](userActor, Shutdown))

      val outgoingMessages: Source[Message, NotUsed] =
        Source.actorRef[User.OutgoingMessage](10000, OverflowStrategy.fail)
          .mapMaterializedValue { outActor =>
            // give the user actor a way to send messages out
            userActor ! User.Connected(outActor)
            evStore ! userActor
            NotUsed
          }.map(
          // transform domain message to web socket message
          (outMsg: User.OutgoingMessage) => TextMessage(outMsg.text))


      // then combine both to a flow
      Flow.fromSinkAndSource(incomingMessages, outgoingMessages)
    }

    val route =
      // TODO: surely there's a better way of serving static files
      path("jscolor.min.js") {
        getFromResource("jscolor.min.js")
      } ~
      path("index.js") {
        getFromResource("index.js")
      } ~
      path("paint") {
        get {
          handleWebSocketMessages(newUser())
        }
      } ~ getFromResource("index.html")

    val binding = Await.result(Http().bindAndHandle(route, "0.0.0.0", 8080), 3.seconds)

    // the rest of the sample code will go here
    println("Started server at 127.0.0.1:8080, press enter to kill server")
    StdIn.readLine()
    system.terminate()
  }
}