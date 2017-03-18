package paint

import scala.language.implicitConversions
import scala.util.parsing.json.JSON

/**
  * Created by casafta on 17/3/2017.
  */
object Parser {
  class Parse(event:String){
    def get[T](key: String): T = JSON.parseFull(event).get.asInstanceOf[Map[String, Any]](key).asInstanceOf[T]
  }
  implicit def toParse(event: String): Parse = new Parse(event)
}
