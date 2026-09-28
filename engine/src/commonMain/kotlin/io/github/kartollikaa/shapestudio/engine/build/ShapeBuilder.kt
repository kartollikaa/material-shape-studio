package io.github.kartollikaa.shapestudio.engine.build

import androidx.graphics.shapes.CornerRounding
import androidx.graphics.shapes.FeatureSerializer
import androidx.graphics.shapes.RoundedPolygon
import androidx.graphics.shapes.circle
import androidx.graphics.shapes.pill
import androidx.graphics.shapes.pillStar
import androidx.graphics.shapes.rectangle
import androidx.graphics.shapes.star
import io.github.kartollikaa.shapestudio.engine.document.Point
import io.github.kartollikaa.shapestudio.engine.document.Repeat
import io.github.kartollikaa.shapestudio.engine.document.Rounding
import io.github.kartollikaa.shapestudio.engine.document.Shape
import io.github.kartollikaa.shapestudio.engine.document.ShapeDocument
import io.github.kartollikaa.shapestudio.engine.document.reject

internal fun ShapeDocument.toRoundedPolygon(): RoundedPolygon =
    transforms.foldIndexed(shape.toRoundedPolygon()) { i, polygon, transform -> transform.applyTo(polygon, i) }

private fun Shape.toRoundedPolygon(): RoundedPolygon = when (this) {
    is Shape.Ngon -> RoundedPolygon(
        numVertices = vertices,
        radius = radius ?: 1f,
        centerX = center?.x ?: 0f,
        centerY = center?.y ?: 0f,
        rounding = rounding.toCornerRounding(),
        perVertexRounding = perVertexRounding?.map { it.toCornerRounding() },
    )
    is Shape.Polygon -> if (repeat == null) {
        RoundedPolygon(
            vertices = vertices.flatten(),
            rounding = rounding.toCornerRounding(),
            perVertexRounding = perVertexRounding?.map { it.toCornerRounding() },
            centerX = center?.x ?: Float.MIN_VALUE,
            centerY = center?.y ?: Float.MIN_VALUE,
        )
    } else {
        repeated(repeat)
    }
    is Shape.Circle -> RoundedPolygon.circle(
        numVertices = vertices ?: 8,
        radius = radius ?: 1f,
        centerX = center?.x ?: 0f,
        centerY = center?.y ?: 0f,
    )
    is Shape.Rectangle -> RoundedPolygon.rectangle(
        width = width ?: 2f,
        height = height ?: 2f,
        rounding = rounding.toCornerRounding(),
        perVertexRounding = perVertexRounding?.map { it.toCornerRounding() },
        centerX = center?.x ?: 0f,
        centerY = center?.y ?: 0f,
    )
    is Shape.Star -> RoundedPolygon.star(
        numVerticesPerRadius = verticesPerRadius,
        radius = radius ?: 1f,
        innerRadius = innerRadius ?: 0.5f,
        rounding = rounding.toCornerRounding(),
        innerRounding = innerRounding?.toCornerRounding(),
        perVertexRounding = perVertexRounding?.map { it.toCornerRounding() },
        centerX = center?.x ?: 0f,
        centerY = center?.y ?: 0f,
    )
    is Shape.Pill -> RoundedPolygon.pill(
        width = width ?: 2f,
        height = height ?: 1f,
        smoothing = smoothing ?: 0f,
        centerX = center?.x ?: 0f,
        centerY = center?.y ?: 0f,
    )
    is Shape.PillStar -> RoundedPolygon.pillStar(
        width = width ?: 2f,
        height = height ?: 1f,
        numVerticesPerRadius = verticesPerRadius ?: 8,
        innerRadiusRatio = innerRadiusRatio ?: 0.5f,
        rounding = rounding.toCornerRounding(),
        innerRounding = innerRounding?.toCornerRounding(),
        perVertexRounding = perVertexRounding?.map { it.toCornerRounding() },
        vertexSpacing = vertexSpacing ?: 0.5f,
        startLocation = startLocation ?: 0f,
        centerX = center?.x ?: 0f,
        centerY = center?.y ?: 0f,
    )
    is Shape.Features -> fromFeatures()
}

private fun Shape.Features.fromFeatures(): RoundedPolygon {
    val features = FeatureSerializer.parse(serialized)
    return try {
        RoundedPolygon(features, centerX = center?.x ?: Float.NaN, centerY = center?.y ?: Float.NaN)
    } catch (e: IllegalArgumentException) {
        reject("shape.serialized", "the features do not form a polygon: ${e.message}")
    }
}

private val materialSliceCentre = Point(0.5f, 0.5f)
private val noRounding = Rounding(0f)

private fun Shape.Polygon.repeated(repeat: Repeat): RoundedPolygon {
    val centre = center ?: materialSliceCentre
    val slice = vertices.mapIndexed { i, p -> Corner(p, perVertexRounding?.get(i) ?: rounding ?: noRounding) }
    val corners = expandRepeat(slice, repeat.count, centre, repeat.mirror)
    return RoundedPolygon(
        vertices = corners.map { it.point }.flatten(),
        perVertexRounding = corners.map { it.rounding.toCornerRounding() },
        centerX = centre.x,
        centerY = centre.y,
    )
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
