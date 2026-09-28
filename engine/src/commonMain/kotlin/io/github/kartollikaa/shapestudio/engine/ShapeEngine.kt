package io.github.kartollikaa.shapestudio.engine

import io.github.kartollikaa.shapestudio.engine.build.flatCubics
import io.github.kartollikaa.shapestudio.engine.build.toRoundedPolygon
import io.github.kartollikaa.shapestudio.engine.document.DocumentJson
import io.github.kartollikaa.shapestudio.engine.document.ShapeDocument
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject

object ShapeEngine {
    fun parse(json: String): ShapeDocument = DocumentJson.decodeFromString(ShapeDocument.serializer(), json)

    fun build(json: String): BuiltShape {
        val polygon = parse(json).toRoundedPolygon()
        return BuiltShape(polygon.flatCubics(), polygon.calculateBounds(), polygon.centerX, polygon.centerY)
    }
}

class BuiltShape internal constructor(
    val cubics: FloatArray,
    val bounds: FloatArray,
    val centerX: Float,
    val centerY: Float,
) {
    fun toJson(): String = buildJsonObject {
        put("cubics", cubics.toJsonArray())
        put("bounds", bounds.toJsonArray())
        put("center", floatArrayOf(centerX, centerY).toJsonArray())
    }.toString()
}

private fun FloatArray.toJsonArray() = JsonArray(map { JsonPrimitive(it) })
