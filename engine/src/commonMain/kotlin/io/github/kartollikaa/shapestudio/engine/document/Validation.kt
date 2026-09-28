package io.github.kartollikaa.shapestudio.engine.document

import androidx.graphics.shapes.FeatureSerializer
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
        is Shape.Circle -> {
            s.vertices?.let { if (it < 3) reject("shape.vertices", "a circle needs at least 3 vertices, got $it") }
            s.radius?.positive("shape.radius")
        }
        is Shape.Rectangle -> {
            s.width?.positive("shape.width")
            s.height?.positive("shape.height")
            s.perVertexRounding?.let { checkPerVertex(it, 4) }
            s.rounding?.check("shape.rounding")
        }
        is Shape.Star -> {
            checkVerticesPerRadius(s.verticesPerRadius)
            val radius = s.radius ?: 1f
            val innerRadius = s.innerRadius ?: 0.5f
            s.radius?.positive("shape.radius")
            innerRadius.positive("shape.innerRadius")
            if (innerRadius >= radius) reject("shape.innerRadius", "must be less than the radius $radius, got $innerRadius")
            s.perVertexRounding?.let { checkPerVertex(it, 2 * s.verticesPerRadius) }
            s.rounding?.check("shape.rounding")
            s.innerRounding?.check("shape.innerRounding")
        }
        is Shape.Pill -> {
            s.width?.positive("shape.width")
            s.height?.positive("shape.height")
            s.smoothing?.fraction("shape.smoothing")
        }
        is Shape.PillStar -> {
            s.width?.positive("shape.width")
            s.height?.positive("shape.height")
            val verticesPerRadius = s.verticesPerRadius ?: 8
            checkVerticesPerRadius(verticesPerRadius)
            s.innerRadiusRatio?.let {
                if (it <= 0f || it > 1f) reject("shape.innerRadiusRatio", "must be greater than 0 and at most 1, got $it")
            }
            s.perVertexRounding?.let { checkPerVertex(it, 2 * verticesPerRadius) }
            s.rounding?.check("shape.rounding")
            s.innerRounding?.check("shape.innerRounding")
            s.vertexSpacing?.fraction("shape.vertexSpacing")
            s.startLocation?.fraction("shape.startLocation")
        }
        is Shape.Features -> {
            val features = try {
                FeatureSerializer.parse(s.serialized)
            } catch (e: Exception) {
                reject("shape.serialized", "not a feature string: ${e.message}")
            }
            if (features.size < 2) reject("shape.serialized", "a polygon needs at least 2 features, got ${features.size}")
        }
    }
    transforms.forEachIndexed { i, transform ->
        when (transform) {
            is Transform.StartAngle ->
                if (i != transforms.lastIndex) reject("transforms[$i]", "startAngle must be the last transform")
            is Transform.Scale -> {
                if (transform.x == 0f) reject("transforms[$i].x", "a scale factor of 0 collapses the shape")
                if (transform.y == 0f) reject("transforms[$i].y", "a scale factor of 0 collapses the shape")
            }
            else -> Unit
        }
    }
}

private fun checkVerticesPerRadius(count: Int) {
    if (count < 2) reject("shape.verticesPerRadius", "must be at least 2, got $count")
}

private fun Float.positive(field: String) {
    if (this <= 0f) reject(field, "must be greater than 0, got $this")
}

private fun Float.fraction(field: String) {
    if (this < 0f || this > 1f) reject(field, "must be between 0 and 1, got $this")
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
