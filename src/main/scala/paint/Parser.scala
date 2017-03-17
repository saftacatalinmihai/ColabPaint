package paint

import scala.util.parsing.json.JSON

/**
  * Created by casafta on 17/3/2017.
  */
object Parser {
  def parseEventType(event: String): String   = JSON.parseFull(event).get.asInstanceOf[Map[String, Any]]("eventType").asInstanceOf[String]
  def parseCursorOwner(event: String): String = JSON.parseFull(event).get.asInstanceOf[Map[String, Any]]("cursorOwner").asInstanceOf[String]
}
