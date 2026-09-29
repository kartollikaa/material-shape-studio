@file:OptIn(ExperimentalSerializationApi::class)

package io.github.kartollikaa.shapestudio.engine.document

import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.KSerializer
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.SerializationException
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.builtins.serializer
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import kotlinx.serialization.json.JsonClassDiscriminator

@Serializable
data class ShapeDocument(
    val v: Int,
    val name: String? = null,
    val shape: Shape,
    val transforms: List<Transform> = emptyList(),
)

@Serializable
data class Rounding(val radius: Float, val smoothing: Float = 0f)

@Serializable(with = PointSerializer::class)
data class Point(val x: Float, val y: Float)

@Serializable
data class Repeat(val count: Int, val mirror: Boolean)

@Serializable
@JsonClassDiscriminator("kind")
sealed interface Shape {
    @Serializable
    @SerialName("polygon")
    data class Polygon(
        val vertices: List<Point>,
        val rounding: Rounding? = null,
        val perVertexRounding: List<Rounding>? = null,
        val center: Point? = null,
        val repeat: Repeat? = null,
    ) : Shape

    @Serializable
    @SerialName("ngon")
    data class Ngon(
        val vertices: Int,
        val radius: Float? = null,
        val center: Point? = null,
        val rounding: Rounding? = null,
        val perVertexRounding: List<Rounding>? = null,
    ) : Shape
}

@Serializable
@JsonClassDiscriminator("type")
sealed interface Transform {
    @Serializable
    @SerialName("normalize")
    data object Normalize : Transform
}

internal object PointSerializer : KSerializer<Point> {
    private val coordinates = ListSerializer(Float.serializer())
    override val descriptor: SerialDescriptor = SerialDescriptor("Point", coordinates.descriptor)

    override fun serialize(encoder: Encoder, value: Point) =
        encoder.encodeSerializableValue(coordinates, listOf(value.x, value.y))

    override fun deserialize(decoder: Decoder): Point {
        val xy = decoder.decodeSerializableValue(coordinates)
        if (xy.size != 2) throw SerializationException("a point is [x, y], got ${xy.size} numbers")
        return Point(xy[0], xy[1])
    }
}
