/**
 * Contenido oficial de ConsolaIO.java — clase de utilidad estándar del sistema.
 * Esta constante es la única fuente de verdad; se usa tanto para el editor
 * (pestaña de solo lectura) como para la fusión de archivos enviada a Judge0.
 */
export const CONSOLA_IO_SOURCE = `import java.util.Scanner;
import java.util.InputMismatchException;

/**
 * La clase ConsolaIO es una adaptación de la clase Consola original desarrollada por
 * el profesor Milton Jesús Vera Contreras (UFPS), orientada a facilitar las operaciones
 * de entrada y salida estándar en programas Java.
 *
 * Esta versión ha sido rediseñada para hacer uso directo de la clase Scanner,
 * eliminando la dependencia de métodos basados en lectura carácter a carácter.
 * Esto permite una mejor compatibilidad con entornos modernos de ejecución,
 * especialmente plataformas de evaluación automática como OnlineGDB, VPL y jueces en línea.
 *
 * @author Milton Jesús Vera Contreras (original)
 * @author Marco Antonio Adarme Jaimes (adaptación)
 * @version 2.0
 * @since 2026
 */
public class ConsolaIO {

    /** Scanner para entrada estándar */
    private Scanner sc;

    /**
     * Constructor de la clase ConsolaIO.
     * Inicializa el objeto Scanner para la lectura de datos desde teclado.
     */
    public ConsolaIO() {
        sc = new Scanner(System.in);
    }

    /**
     * Lee una línea completa (incluye espacios). Si la primera lectura devuelve
     * una cadena vacía (por ejemplo tras leer un número), intenta leer una segunda vez.
     * @return la línea leída (puede ser cadena vacía)
     */
    public String leerCadena() {
        String s = sc.nextLine();
        if (s.isEmpty() && sc.hasNextLine()) {
            s = sc.nextLine();
        }
        return s;
    }

    /**
     * Lee una cadena de texto mostrando previamente un mensaje.
     * @param aviso mensaje que se muestra al usuario
     * @return la cadena ingresada
     */
    public String leerCadena(String aviso) {
        imprimir(aviso);
        return leerCadena();
    }

    /**
     * Lee el siguiente token (sin espacios).
     * @return token leído
     */
    public String leerToken() {
        return sc.next();
    }

    public String leerToken(String aviso) {
        imprimir(aviso);
        return leerToken();
    }

    /**
     * Lee un número tipo short validando errores.
     * @return el número short ingresado
     */
    public short leerShort() {
        while (true) {
            try {
                short v = sc.nextShort();
                sc.nextLine();
                return v;
            } catch (InputMismatchException e) {
                System.out.println("Error: Ingrese un número short válido");
                sc.nextLine();
            }
        }
    }

    public short leerShort(String aviso) {
        imprimir(aviso);
        return leerShort();
    }

    /**
     * Lee un número tipo byte validando errores.
     * @return el número byte ingresado
     */
    public byte leerByte() {
        while (true) {
            try {
                byte v = sc.nextByte();
                sc.nextLine();
                return v;
            } catch (InputMismatchException e) {
                System.out.println("Error: Ingrese un número byte válido");
                sc.nextLine();
            }
        }
    }

    public byte leerByte(String aviso) {
        imprimir(aviso);
        return leerByte();
    }

    /**
     * Lee un número entero validando errores de entrada.
     * @return el número entero ingresado
     */
    public int leerEntero() {
        while (true) {
            try {
                int v = sc.nextInt();
                sc.nextLine();
                return v;
            } catch (InputMismatchException e) {
                System.out.println("Error: Ingrese un entero válido");
                sc.nextLine();
            }
        }
    }

    public int leerEntero(String aviso) {
        imprimir(aviso);
        return leerEntero();
    }

    /**
     * Lee un número tipo float validando errores.
     * @return el número float ingresado
     */
    public float leerFloat() {
        while (true) {
            try {
                float v = sc.nextFloat();
                sc.nextLine();
                return v;
            } catch (InputMismatchException e) {
                System.out.println("Error: Ingrese un número float válido");
                sc.nextLine();
            }
        }
    }

    public float leerFloat(String aviso) {
        imprimir(aviso);
        return leerFloat();
    }

    /**
     * Lee un número tipo double validando errores.
     * @return el número double ingresado
     */
    public double leerDouble() {
        while (true) {
            try {
                double v = sc.nextDouble();
                sc.nextLine();
                return v;
            } catch (InputMismatchException e) {
                System.out.println("Error: Ingrese un número double válido");
                sc.nextLine();
            }
        }
    }

    public double leerDouble(String aviso) {
        imprimir(aviso);
        return leerDouble();
    }

    /**
     * Lee un valor booleano (true o false).
     * @return el valor booleano ingresado
     */
    public boolean leerBoolean() {
        while (true) {
            try {
                boolean v = sc.nextBoolean();
                sc.nextLine();
                return v;
            } catch (InputMismatchException e) {
                System.out.println("Error: Ingrese true o false");
                sc.nextLine();
            }
        }
    }

    public boolean leerBoolean(String aviso) {
        imprimir(aviso);
        return leerBoolean();
    }

    /**
     * Lee un carácter desde la entrada estándar.
     * @return el carácter ingresado
     */
    public char leerCaracter() {
        String s = leerCadena();
        return (s == null || s.isEmpty()) ? '\\0' : s.charAt(0);
    }

    public char leerCaracter(String aviso) {
        imprimir(aviso);
        return leerCaracter();
    }

    /**
     * Lee un entero dentro de un rango específico.
     * @param min valor mínimo permitido
     * @param max valor máximo permitido
     * @return número entero dentro del rango
     */
    public int leerEnteroEnRango(int min, int max) {
        int num;
        do {
            num = leerEntero();
            if (num < min || num > max) {
                System.out.println("Error: Valor fuera de rango [" + min + ", " + max + "]");
            }
        } while (num < min || num > max);
        return num;
    }

    public int leerEnteroEnRango(String aviso, int min, int max) {
        imprimir(aviso);
        return leerEnteroEnRango(min, max);
    }

    /**
     * Imprime un mensaje en consola.
     * @param aviso texto a imprimir
     */
    public void imprimir(String aviso) {
        System.out.println(aviso);
    }

    public void imprimir(int num) {
        System.out.println(num);
    }

    public void imprimir(float num) {
        System.out.println(num);
    }

    public void imprimir(double num) {
        System.out.println(num);
    }
}`;
