package io.github.kartollikaa.shapestudio.engine.build

import androidx.graphics.shapes.CornerRounding
import androidx.graphics.shapes.RoundedPolygon
import io.github.kartollikaa.shapestudio.engine.document.Point
import io.github.kartollikaa.shapestudio.engine.document.Rounding
import io.github.kartollikaa.shapestudio.engine.document.Shape
import io.github.kartollikaa.shapestudio.engine.document.ShapeDocument
import io.github.kartollikaa.shapestudio.engine.document.Transform

internal fun ShapeDocument.toRoundedPolygon(): RoundedPolygon =
    transforms.fold(shape.toRoundedPolygon()) { polygon, transform -> transform.applyTo(polygon) }

private fun Shape.toRoundedPolygon(): RoundedPolygon = when (this) {
    is Shape.Ngon -> RoundedPolygon(
        numVertices = vertices,
        radius = radius ?: 1f,
        centerX = center?.x ?: 0f,
        centerY = center?.y ?: 0f,
        rounding = rounding.toCornerRounding(),
        perVertexRounding = perVertexRounding?.map { it.toCornerRounding() },
    )
    is Shape.Polygon -> RoundedPolygon(
        vertices = vertices.flatten(),
        rounding = rounding.toCornerRounding(),
        perVertexRounding = perVertexRounding?.map { it.toCornerRounding() },
        centerX = center?.x ?: Float.MIN_VALUE,
        centerY = center?.y ?: Float.MIN_VALUE,
    )
}

private fun Transform.applyTo(polygon: RoundedPolygon): RoundedPolygon = when (this) {
    Transform.Normalize -> polygon.normalized()
}

internal fun Rounding?.toCornerRounding(): CornerRounding =
    if (this == null) CornerRounding.Unrounded else CornerRounding(radius, smoothing)

internal fun List<Point>.flatten(): FloatArray =
    FloatArray(size * 2) { i -> this[i / 2].let { if (i % 2 == 0) it.x else it.y } }

internal fun RoundedPolygon.flatCubics(): FloatArray {
    val out = FloatArray(cubics.size * 8)
    cubics.forEachIndexed { i, c ->
        val o = i * 8
        out[o] = c.anchor0X
        out[o + 1] = c.anchor0Y
        out[o + 2] = c.control0X
        out[o + 3] = c.control0Y
        out[o + 4] = c.control1X
        out[o + 5] = c.control1Y
        out[o + 6] = c.anchor1X
        out[o + 7] = c.anchor1Y
    }
    return out
}
