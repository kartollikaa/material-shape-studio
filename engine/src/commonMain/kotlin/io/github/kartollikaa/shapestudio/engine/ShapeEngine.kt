package io.github.kartollikaa.shapestudio.engine

import androidx.graphics.shapes.Feature
import androidx.graphics.shapes.Morph
import io.github.kartollikaa.shapestudio.engine.build.flatCubics
import io.github.kartollikaa.shapestudio.engine.build.toRoundedPolygon
import io.github.kartollikaa.shapestudio.engine.document.decodeDocument
import io.github.kartollikaa.shapestudio.engine.document.reject
import io.github.kartollikaa.shapestudio.engine.document.ShapeDocument
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject

object ShapeEngine {
    fun parse(json: String): ShapeDocument = decodeDocument(json)

    fun build(json: String): BuiltShape {
        val polygon = parse(json).toRoundedPolygon()
        return BuiltShape(
            cubics = polygon.flatCubics(),
            bounds = polygon.calculateBounds(),
            centerX = polygon.centerX,
            centerY = polygon.centerY,
            features = polygon.features.map { BuiltFeature(it.typeName(), it.cubics.flatCubics()) },
        )
    }

    fun morph(start: String, end: String): ShapeMorph =
        ShapeMorph(Morph(parse(start).toRoundedPolygon(), parse(end).toRoundedPolygon()))
}

class ShapeMorph internal constructor(private val morph: Morph) {
    fun cubics(progress: Float): FloatArray {
        if (progress.isNaN() || progress < 0f || progress > 1f) reject("progress", "must be between 0 and 1, got $progress")
        return morph.asCubics(progress).flatCubics()
    }

    fun maxBounds(): FloatArray = morph.calculateMaxBounds()
}

class BuiltShape internal constructor(
    val cubics: FloatArray,
    val bounds: FloatArray,
    val centerX: Float,
    val centerY: Float,
    val features: List<BuiltFeature>,
) {
    fun toJson(): String = buildJsonObject {
        put("cubics", cubics.toJsonArray())
        put("bounds", bounds.toJsonArray())
        put("center", floatArrayOf(centerX, centerY).toJsonArray())
        put(
            "features",
            JsonArray(
                features.map { buildJsonObject { put("type", JsonPrimitive(it.type)); put("cubics", it.cubics.toJsonArray()) } },
            ),
        )
    }.toString()
}

class BuiltFeature internal constructor(val type: String, val cubics: FloatArray)

private fun Feature.typeName() = when {
    isConvexCorner -> "convex"
    isConcaveCorner -> "concave"
    isEdge -> "edge"
    else -> "ignorable"
}

private fun FloatArray.toJsonArray() = JsonArray(map { JsonPrimitive(it) })
