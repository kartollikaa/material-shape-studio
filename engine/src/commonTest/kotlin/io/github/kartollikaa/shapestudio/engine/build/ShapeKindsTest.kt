package io.github.kartollikaa.shapestudio.engine.build

import androidx.graphics.shapes.CornerRounding
import androidx.graphics.shapes.FeatureSerializer
import androidx.graphics.shapes.RoundedPolygon
import androidx.graphics.shapes.circle
import androidx.graphics.shapes.pill
import androidx.graphics.shapes.pillStar
import androidx.graphics.shapes.rectangle
import androidx.graphics.shapes.star
import io.github.kartollikaa.shapestudio.engine.ShapeEngine
import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals

class ShapeKindsTest {
    private val triangle = "V1n0.5,1,0.33333334,0.6666667,0.16666667,0.33333334,0,0x0,0,0,0,0,0,0,0n0,0,0.3333333,0,0.6666666,0,1,0x1,0,1,0,1,0,1,0n1,0,0.8333334,0.3333333,0.6666666,0.6666666,0.5,1x0.5,1,0.5,1,0.5,1,0.5,1"

    @Test
    fun circleDocumentBuildsTheLibrarysCircle() = assertBuilds(
        RoundedPolygon.circle(numVertices = 10, radius = 2f, centerX = 1f, centerY = 2f),
        """{"kind":"circle","vertices":10,"radius":2,"center":[1,2]}""",
    )

    @Test
    fun circleDefaultsAreTheLibrarysDefaults() = assertBuilds(RoundedPolygon.circle(), """{"kind":"circle"}""")

    @Test
    fun rectangleDocumentBuildsTheLibrarysRectangle() = assertBuilds(
        RoundedPolygon.rectangle(
            width = 1.6f,
            height = 1f,
            perVertexRounding = listOf(CornerRounding(0.2f), CornerRounding(0.2f), CornerRounding(1f), CornerRounding(1f)),
            centerX = 1f,
            centerY = 2f,
        ),
        """{"kind":"rectangle","width":1.6,"height":1,"center":[1,2],"perVertexRounding":[{"radius":0.2},{"radius":0.2},{"radius":1},{"radius":1}]}""",
    )

    @Test
    fun rectangleDefaultsAreTheLibrarysDefaults() = assertBuilds(RoundedPolygon.rectangle(), """{"kind":"rectangle"}""")

    @Test
    fun starDocumentBuildsTheLibrarysStar() = assertBuilds(
        RoundedPolygon.star(
            numVerticesPerRadius = 8,
            radius = 1.2f,
            innerRadius = 0.8f,
            rounding = CornerRounding(0.15f),
            innerRounding = CornerRounding(0.05f, 0.3f),
            centerX = 1f,
            centerY = 2f,
        ),
        """{"kind":"star","verticesPerRadius":8,"radius":1.2,"innerRadius":0.8,"center":[1,2],"rounding":{"radius":0.15},"innerRounding":{"radius":0.05,"smoothing":0.3}}""",
    )

    @Test
    fun starDefaultsAreTheLibrarysDefaults() =
        assertBuilds(RoundedPolygon.star(numVerticesPerRadius = 5), """{"kind":"star","verticesPerRadius":5}""")

    @Test
    fun pillDocumentBuildsTheLibrarysPill() = assertBuilds(
        RoundedPolygon.pill(width = 3f, height = 1f, smoothing = 0.5f, centerX = 1f, centerY = 2f),
        """{"kind":"pill","width":3,"height":1,"smoothing":0.5,"center":[1,2]}""",
    )

    @Test
    fun pillDefaultsAreTheLibrarysDefaults() = assertBuilds(RoundedPolygon.pill(), """{"kind":"pill"}""")

    @Test
    fun pillStarDocumentBuildsTheLibrarysPillStar() = assertBuilds(
        RoundedPolygon.pillStar(
            width = 3f,
            height = 1.5f,
            numVerticesPerRadius = 10,
            innerRadiusRatio = 0.7f,
            rounding = CornerRounding(0.1f),
            innerRounding = CornerRounding(0.2f, 0.5f),
            vertexSpacing = 0.3f,
            startLocation = 0.25f,
            centerX = 1f,
            centerY = 2f,
        ),
        """{"kind":"pillStar","width":3,"height":1.5,"verticesPerRadius":10,"innerRadiusRatio":0.7,"rounding":{"radius":0.1},"innerRounding":{"radius":0.2,"smoothing":0.5},"vertexSpacing":0.3,"startLocation":0.25,"center":[1,2]}""",
    )

    @Test
    fun pillStarDefaultsAreTheLibrarysDefaults() = assertBuilds(RoundedPolygon.pillStar(), """{"kind":"pillStar"}""")

    @Test
    fun featuresDocumentBuildsFromTheSerialisedFeatures() = assertBuilds(
        RoundedPolygon(FeatureSerializer.parse(triangle), centerX = 0.5f, centerY = 0.5f),
        """{"kind":"features","serialized":"$triangle","center":[0.5,0.5]}""",
    )

    @Test
    fun featuresWithoutCentreUseTheLibrarysDefaultCentre() {
        val expected = RoundedPolygon(FeatureSerializer.parse(triangle))
        val built = ShapeEngine.build("""{"v":1,"shape":{"kind":"features","serialized":"$triangle"}}""")
        assertContentEquals(expected.flatCubics(), built.cubics)
        assertEquals(expected.centerX, built.centerX)
        assertEquals(expected.centerY, built.centerY)
    }

    private fun assertBuilds(expected: RoundedPolygon, shapeJson: String) {
        val built = ShapeEngine.build("""{"v":1,"shape":$shapeJson}""")
        assertContentEquals(expected.flatCubics(), built.cubics)
    }
}
