CU002 - M1ReasignarBase

Campos devueltos por SPs de lectura (obligatorio)

vcodigo_paquete = Llamada SP: get_paquetes_por_estado(p_estado="pendiente empacar") (devuelve codigo_paquete)
Campos devueltos
codigo_paquete
fecha_actualizado
codigo_cliente
nombre_cliente
num_cliente
codigo_puntoentrega
codigo_base
ordinal_numrecibe
concatenarpuntoentrega
region_entrega
latitud
longitud
concatenarnumrecibe
Variables
vcodigo_paquete visible no editable
vfecha_actualizado visible no editable
vcodigo_cliente no visible no editable
vnombre_cliente visible no editable
vnum_cliente visible no editable
vcodigo_puntoentrega no visible no editable
vcodigo_base visible no editable
vordinal_numrecibe no visible no editable
vconcatenarpuntoentrega visible no editable
vRegion_Entrega no visible no editable
vLatitud no visible no editable
vLongitud no visible no editable
vconcatenarnumrecibe visible no editable

vtipo_documento = Llamada SP: get_mov_contable_detalle(p_tipo_documento="FAC", p_numero_documento=vcodigo_paquete) (devuelve tipo_documento)
Campos devueltos
tipo_documento
numero_documento
ordinal
codigo_producto
nombre_producto
cantidad
saldo
precio_total
Variables
vtipo_documento no visible no editable
vnumero_documento no visible no editable
vordinal no visible no editable
vcodigo_producto no visible no editable
vnombre_producto visible no editable
vcantidad visible no editable
vsaldo no visible no editable
vprecio_total no visible no editable

vNombre_base_nueva = Llamada SP: get_bases() (devuelve nombre)
Campos devueltos
codigo_base
nombre
Variables
vCodigo_base_nueva visible editable
vNombre_base_nueva visible no editable

Ejecucion
node wizard/Modulo\ 1/ReasignarBase/server.js
