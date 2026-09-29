package io.github.kartollikaa.shapestudio.engine.build

import androidx.graphics.shapes.CornerRounding
import androidx.graphics.shapes.RoundedPolygon
import io.github.kartollikaa.shapestudio.engine.ShapeEngine
import io.github.kartollikaa.shapestudio.engine.document.Point
import io.github.kartollikaa.shapestudio.engine.document.Rounding
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class RepeatExpansionTest {
    private val centre = Point(0.5f, 0.5f)
    private val pillSlice = listOf(
        Corner(Point(0.961f, 0.039f), Rounding(0.426f)),
        Corner(Point(1.001f, 0.428f), Rounding(0f)),
        Corner(Point(1.000f, 0.609f), Rounding(1f)),
    )

    @Test
    fun rotationRepeatsTheSliceAboutTheCentre() {
        val slice = listOf(Corner(Point(1f, 0.5f), Rounding(0.1f)), Corner(Point(0.5f, 1f), Rounding(0.2f)))
        val out = expandRepeat(slice, count = 2, center = centre, mirror = false)
        assertEquals(4, out.size)
        assertNear(Point(1f, 0.5f), out[0].point)
        assertNear(Point(0.5f, 1f), out[1].point)
        assertNear(Point(0f, 0.5f), out[2].point)
        assertNear(Point(0.5f, 0f), out[3].point)
        assertEquals(listOf(0.1f, 0.2f, 0.1f, 0.2f), out.map { it.rounding.radius })
    }

    @Test
    fun rotationByThreeStepsIs120Degrees() {
        val out = expandRepeat(listOf(Corner(Point(1f, 0.5f), Rounding(0f))), count = 3, center = centre, mirror = false)
        assertEquals(3, out.size)
        assertNear(Point(0.25f, 0.9330127f), out[1].point)
        assertNear(Point(0.25f, 0.0669873f), out[2].point)
    }

    @Test
    fun rotationRepeatsATwoVertexSliceThreeTimes() {
        val slice = listOf(Corner(Point(1f, 0.5f), Rounding(0.1f)), Corner(Point(0.5f, 1f), Rounding(0.2f)))
        val out = expandRepeat(slice, count = 3, center = centre, mirror = false)
        assertEquals(6, out.size)
        for (copy in 1..2) {
            slice.forEachIndexed { i, corner ->
                assertNear(corner.point.rotated(120f * copy), out[copy * 2 + i].point)
                assertEquals(corner.rounding, out[copy * 2 + i].rounding)
            }
        }
    }

    @Test
    fun mirrorRepeatHasRotationalSymmetry() {
        val points = expandRepeat(pillSlice, count = 2, center = centre, mirror = true).map { it.point }
        assertSameSet(points, points.map { it.rotated(180f) })
    }

    @Test
    fun mirrorRepeatHasMirrorSymmetryThroughTheFirstVertex() {
        val points = expandRepeat(pillSlice, count = 2, center = centre, mirror = true).map { it.point }
        val first = pillSlice.first().point
        val axis = atan2(first.y - centre.y, first.x - centre.x)
        assertSameSet(points, points.map { it.reflected(axis) })
    }

    @Test
    fun mirrorRepeatDoesNotDuplicateTheFirstVertex() {
        val points = expandRepeat(pillSlice, count = 2, center = centre, mirror = true).map { it.point }
        assertEquals(2 * (2 * pillSlice.size - 1), points.size)
        points.indices.forEach { i ->
            val next = points[(i + 1) % points.size]
            assertTrue(distance(points[i], next) > 1e-4f, "vertices $i and ${(i + 1) % points.size} coincide")
        }
    }

    @Test
    fun polygonWithRepeatUsesMaterialsDefaultCentre() {
        val withoutCentre = ShapeEngine.build(
            """{"v":1,"shape":{"kind":"polygon","vertices":[[0.926,0.97],[-0.021,0.967]],"perVertexRounding":[{"radius":0.189,"smoothing":0.811},{"radius":0.187,"smoothing":0.057}],"repeat":{"count":2,"mirror":false}}}""",
        )
        val withCentre = ShapeEngine.build(
            """{"v":1,"shape":{"kind":"polygon","vertices":[[0.926,0.97],[-0.021,0.967]],"perVertexRounding":[{"radius":0.189,"smoothing":0.811},{"radius":0.187,"smoothing":0.057}],"center":[0.5,0.5],"repeat":{"count":2,"mirror":false}}}""",
        )
        assertContentEquals(withCentre.cubics, withoutCentre.cubics)
    }

    @Test
    fun polygonWithRepeatBuildsTheExpandedPolygon() {
        val built = ShapeEngine.build(
            """{"v":1,"shape":{"kind":"polygon","vertices":[[0.961,0.039],[1.001,0.428],[1.0,0.609]],"perVertexRounding":[{"radius":0.426},{"radius":0},{"radius":1}],"repeat":{"count":2,"mirror":true}}}""",
        )
        val corners = expandRepeat(pillSlice, count = 2, center = centre, mirror = true)
        val expected = RoundedPolygon(
            vertices = corners.map { it.point }.flatten(),
            perVertexRounding = corners.map { CornerRounding(it.rounding.radius, it.rounding.smoothing) },
            centerX = 0.5f,
            centerY = 0.5f,
        )
        assertContentEquals(expected.flatCubics(), built.cubics)
    }

    private fun Point.rotated(degrees: Float): Point {
        val a = degrees / 180f * PI.toFloat()
        val dx = x - centre.x
        val dy = y - centre.y
        return Point(dx * cos(a) - dy * sin(a) + centre.x, dx * sin(a) + dy * cos(a) + centre.y)
    }

    private fun Point.reflected(axis: Float): Point {
        val dx = x - centre.x
        val dy = y - centre.y
        val c = cos(2 * axis)
        val s = sin(2 * axis)
        return Point(dx * c + dy * s + centre.x, dx * s - dy * c + centre.y)
    }

    private fun distance(a: Point, b: Point) = kotlin.math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y))

    private fun assertNear(expected: Point, actual: Point) {
        assertTrue(abs(expected.x - actual.x) < 1e-5f && abs(expected.y - actual.y) < 1e-5f, "expected $expected, got $actual")
    }

    private fun assertSameSet(expected: List<Point>, actual: List<Point>) {
        assertEquals(expected.size, actual.size)
        actual.forEach { p ->
            assertTrue(expected.any { distance(it, p) < 1e-4f }, "$p has no counterpart in $expected")
        }
    }
}
