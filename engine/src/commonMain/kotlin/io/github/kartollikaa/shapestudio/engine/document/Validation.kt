package io.github.kartollikaa.shapestudio.engine.document

import kotlinx.serialization.SerializationException
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.descriptors.elementNames
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.intOrNull

private const val SUPPORTED_VERSION = 1

private val shapeKinds = Shape.serializer().descriptor.subclassNames()
private val transformTypes = Transform.serializer().descriptor.subclassNames()

internal fun decodeDocument(json: String): ShapeDocument {
    val root = try {
        DocumentJson.parseToJsonElement(json)
    } catch (e: SerializationException) {
        reject("document", "not valid JSON (${e.message?.lineSequence()?.first()})")
    }
    precheck(root)
    val document = try {
        DocumentJson.decodeFromString(ShapeDocument.serializer(), json)
    } catch (e: SerializationException) {
        val message = e.message.orEmpty().lineSequence().first()
        reject(message.pathOrNull() ?: "document", message)
    }
    document.validate()
    return document
}

private fun precheck(root: JsonElement) {
    if (root !is JsonObject) reject("document", "expected a JSON object")
    val version = (root["v"] as? JsonPrimitive)?.intOrNull
    if (version != SUPPORTED_VERSION) reject("v", "only version $SUPPORTED_VERSION is supported, got ${root["v"]}")
    val shape = root["shape"] as? JsonObject ?: reject("shape", "expected an object with a kind")
    val kind = (shape["kind"] as? JsonPrimitive)?.content
    if (kind !in shapeKinds) reject("shape.kind", "unknown kind $kind; expected one of ${shapeKinds.joinToString()}")
    (root["transforms"] as? JsonArray)?.forEachIndexed { i, transform ->
        val type = ((transform as? JsonObject)?.get("type") as? JsonPrimitive)?.content
        if (type !in transformTypes) {
            reject("transforms[$i].type", "unknown type $type; expected one of ${transformTypes.joinToString()}")
        }
    }
}

private fun ShapeDocument.validate() {
    when (val s = shape) {
        is Shape.Polygon -> {
            s.repeat?.let { if (it.count < 1) reject("shape.repeat.count", "must be at least 1, got ${it.count}") }
            val total = s.expandedVertexCount()
            if (total < 3) reject("shape.vertices", "a polygon needs at least 3 vertices after repeat, got $total")
            s.perVertexRounding?.let { checkPerVertex(it, s.vertices.size) }
            s.rounding?.check("shape.rounding")
        }
        is Shape.Ngon -> {
            if (s.vertices < 3) reject("shape.vertices", "an ngon needs at least 3 vertices, got ${s.vertices}")
            s.radius?.let { if (it <= 0f) reject("shape.radius", "must be greater than 0, got $it") }
            s.perVertexRounding?.let { checkPerVertex(it, s.vertices) }
            s.rounding?.check("shape.rounding")
        }
    }
}

private fun Shape.Polygon.expandedVertexCount(): Int {
    val repeat = repeat ?: return vertices.size
    return if (repeat.mirror) repeat.count * (2 * vertices.size - 1) else repeat.count * vertices.size
}

private fun checkPerVertex(roundings: List<Rounding>, vertices: Int) {
    if (roundings.size != vertices) {
        reject("shape.perVertexRounding", "expected $vertices entries, one per vertex, got ${roundings.size}")
    }
    roundings.forEachIndexed { i, r -> r.check("shape.perVertexRounding[$i]") }
}

private fun Rounding.check(field: String) {
    if (radius < 0f) reject("$field.radius", "must be at least 0, got $radius")
    if (smoothing < 0f || smoothing > 1f) reject("$field.smoothing", "must be between 0 and 1, got $smoothing")
}

private fun String.pathOrNull(): String? =
    substringAfter("at path: ", "").trim().removePrefix("$").removePrefix(".").takeIf { it.isNotEmpty() }

private fun SerialDescriptor.subclassNames(): Set<String> = getElementDescriptor(1).elementNames.toSet()
