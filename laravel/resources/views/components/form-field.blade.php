@props(['name', 'label', 'type' => 'text', 'value' => '', 'help' => null, 'required' => false])
<div class="field">
    <label for="{{ $name }}">{{ $label }} @if($required)<span aria-hidden="true">*</span>@endif</label>
    @if($slot->isEmpty())
        <input id="{{ $name }}" name="{{ $name }}" type="{{ $type }}" value="{{ old($name, $value) }}"
            @required($required) @if($help || $errors->has($name)) aria-describedby="{{ $name }}-help" @endif
            @if($errors->has($name)) aria-invalid="true" @endif {{ $attributes }}>
    @else
        {{ $slot }}
    @endif
    @if($errors->has($name))
        <p id="{{ $name }}-help" class="field-error" role="alert">{{ $errors->first($name) }}</p>
    @elseif($help)
        <p id="{{ $name }}-help" class="field-help">{{ $help }}</p>
    @endif
</div>
